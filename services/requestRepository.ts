import { MoneyRequest, RequestStatus, RequestType } from "@/types/payment";
import {
  createMoneyRequestOnChain,
  acceptMoneyRequestOnChain,
  rejectMoneyRequestOnChain,
  markMoneyRequestPaidOnChain,
  fetchGroupMoneyRequestsOnChain,
} from "@/lib/soroban/moneyRequest";
import { isSupabaseConfigured } from "@/lib/supabase";

export const requestRepository = {
  async fetchRequests(groupId?: string): Promise<MoneyRequest[]> {
    if (groupId) {
      try {
        const chainReqs = await fetchGroupMoneyRequestsOnChain(groupId);
        if (chainReqs.length > 0) return chainReqs;
      } catch (err) {
        console.warn("Soroban fetchGroupMoneyRequests notice:", err);
      }
    }

    // Always try the REST API first (works on Vercel)
    try {
      const params = new URLSearchParams();
      if (groupId) params.append("groupId", groupId);
      const url = `/api/requests${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          return data.requests;
        }
      }
    } catch (err) {
      console.warn("API fetchRequests notice:", err);
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("splitstellar-request-store");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.requests && Array.isArray(parsed.state.requests)) {
            const requests = parsed.state.requests as MoneyRequest[];
            if (groupId) {
              return requests.filter((r) => r.groupId === groupId);
            }
            return requests;
          }
        }
      } catch {}
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
    let req: MoneyRequest;
    try {
      req = await createMoneyRequestOnChain(
        groupId,
        from,
        to,
        amount,
        currency,
        note,
        type,
        from
      );
    } catch (e) {
      console.warn("Soroban createMoneyRequestOnChain notice:", e);
      const now = new Date().toISOString();
      req = {
        id: `${type === "DirectLoan" ? "loan" : "req"}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        groupId,
        from,
        to,
        amount,
        currency: currency || "XLM",
        note,
        type,
        status: type === "DirectLoan" ? "Accepted" : "Pending",
        createdAt: now,
        updatedAt: now,
      };
    }

    try {
      const res = await fetch(`/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (data.success && data.request) {
        return data.request;
      }
    } catch {
      // Local sync fallback
    }

    return req;
  },

  async updateRequestStatus(
    id: string,
    status: RequestStatus,
    transactionHash?: string,
    ledgerNumber?: number,
    returnTxHash?: string
  ): Promise<MoneyRequest> {
    if (status === "Accepted") {
      try { await acceptMoneyRequestOnChain(id, ""); } catch (e) { console.warn("Soroban accept notice:", e); }
    } else if (status === "Rejected") {
      try { await rejectMoneyRequestOnChain(id, ""); } catch (e) { console.warn("Soroban reject notice:", e); }
    } else if (status === "Paid" || status === "Completed") {
      try { await markMoneyRequestPaidOnChain(id, transactionHash || "", ledgerNumber, ""); } catch (e) { console.warn("Soroban paid notice:", e); }
    }

    try {
      const res = await fetch(`/api/requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, transactionHash, ledgerNumber, returnTxHash }),
      });
      const data = await res.json();
      if (data.success && data.request) {
        return data.request;
      }
    } catch (e) {
      console.warn("API updateRequestStatus notice:", e);
    }

    const { useRequestStore } = await import("@/stores/requestStore");
    const current = useRequestStore.getState().requests.find((r) => r.id === id);
    const now = new Date().toISOString();

    return {
      ...(current || {
        id,
        groupId: "",
        from: "",
        to: "",
        amount: 0,
        currency: "XLM",
        type: "Request",
        createdAt: now,
      }),
      status,
      updatedAt: now,
      transactionHash: transactionHash || current?.transactionHash,
      ledgerNumber: ledgerNumber !== undefined ? ledgerNumber : current?.ledgerNumber,
      returnTxHash: returnTxHash || current?.returnTxHash,
    };
  },
};
