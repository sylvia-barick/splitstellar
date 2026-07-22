import { MoneyRequest, RequestStatus, RequestType } from "@/types/payment";
import {
  createMoneyRequestOnChain,
  acceptMoneyRequestOnChain,
  rejectMoneyRequestOnChain,
  markMoneyRequestPaidOnChain,
  fetchGroupMoneyRequestsOnChain,
} from "@/lib/soroban/moneyRequest";

// ─────────────────────────────────────────────────────────────────────────────
// requestRepository — SINGLE SOURCE OF TRUTH: /api/requests (→ lib/db.ts → Supabase)
// No direct Supabase table calls. No localStorage fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const requestRepository = {
  async fetchRequests(groupId?: string): Promise<MoneyRequest[]> {
    // 1. Try Soroban (best-effort)
    if (groupId) {
      try {
        const chainReqs = await fetchGroupMoneyRequestsOnChain(groupId);
        if (chainReqs.length > 0) return chainReqs;
      } catch {
        // Expected
      }
    }

    // 2. REST API — authoritative source
    try {
      const url = groupId
        ? `/api/requests?groupId=${encodeURIComponent(groupId)}`
        : `/api/requests`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          return data.requests as MoneyRequest[];
        }
      }
    } catch (err) {
      console.warn("[requestRepo] API fetch error:", err);
    }

    return [];
  },

  async createRequest(
    groupId: string,
    from: string,
    to: string,
    amount: number,
    currency: string,
    note?: string,
    type: RequestType = "Request"
  ): Promise<MoneyRequest> {
    // Try Soroban (best-effort)
    try {
      const chainReq = await createMoneyRequestOnChain(
        groupId, from, to, amount, currency, note, type, from
      );
      const res = await fetch(`/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chainReq),
      });
      const data = await res.json();
      if (data.success && data.request) return data.request as MoneyRequest;
      return chainReq;
    } catch {
      // Expected — fall through
    }

    const res = await fetch(`/api/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId, from, to, amount,
        currency: currency || "XLM",
        note, type,
        status: type === "DirectLoan" ? "Accepted" : "Pending",
      }),
    });
    const data = await res.json();
    if (!data.success || !data.request) {
      throw new Error(data.error || "Failed to create request");
    }
    return data.request as MoneyRequest;
  },

  async updateRequestStatus(
    id: string,
    status: RequestStatus,
    transactionHash?: string,
    ledgerNumber?: number,
    returnTxHash?: string
  ): Promise<MoneyRequest> {
    // Try Soroban (best-effort, no await needed for UI correctness)
    if (status === "Accepted") {
      acceptMoneyRequestOnChain(id, "").catch(() => {});
    } else if (status === "Rejected") {
      rejectMoneyRequestOnChain(id, "").catch(() => {});
    } else if (status === "Paid" || status === "Completed") {
      markMoneyRequestPaidOnChain(id, transactionHash || "", ledgerNumber, "").catch(() => {});
    }

    const res = await fetch(`/api/requests`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, transactionHash, ledgerNumber, returnTxHash }),
    });
    const data = await res.json();
    if (!data.success || !data.request) {
      throw new Error(data.error || "Failed to update request status");
    }
    return data.request as MoneyRequest;
  },
};
