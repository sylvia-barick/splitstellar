import { Payment, PaymentStatus } from "@/types/payment";
import { recordPaymentOnChain, fetchGroupSettlementsOnChain } from "@/lib/soroban/settlement";

// ─────────────────────────────────────────────────────────────────────────────
// paymentRepository — SINGLE SOURCE OF TRUTH: /api/payments (→ lib/db.ts → Supabase)
// No direct Supabase table calls. No localStorage fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const paymentRepository = {
  async fetchPayments(groupId?: string): Promise<Payment[]> {
    // 1. Try Soroban (best-effort)
    if (groupId) {
      try {
        const chainPay = await fetchGroupSettlementsOnChain(groupId);
        if (chainPay.length > 0) return chainPay;
      } catch {
        // Expected
      }
    }

    // 2. REST API — authoritative source
    try {
      const url = groupId
        ? `/api/payments?groupId=${encodeURIComponent(groupId)}`
        : `/api/payments`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          return data.payments as Payment[];
        }
      }
    } catch (err) {
      console.warn("[paymentRepo] API fetch error:", err);
    }

    return [];
  },

  async createPayment(
    groupId: string,
    from: string,
    to: string,
    amount: number,
    currency: string,
    note?: string,
    transactionHash?: string,
    ledgerNumber?: number,
    settlementId?: string,
    requestId?: string
  ): Promise<Payment> {
    // Try Soroban (best-effort)
    try {
      const chainPayment = await recordPaymentOnChain(
        { groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId },
        from
      );
      // Persist via API even when Soroban succeeds
      const res = await fetch(`/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...chainPayment,
          status: transactionHash ? "Paid" : chainPayment.status || "Pending",
        }),
      });
      const data = await res.json();
      if (data.success && data.payment) return data.payment as Payment;
      return chainPayment;
    } catch {
      // Expected — fall through to API-only path
    }

    const res = await fetch(`/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId, from, to, amount,
        currency: currency || "XLM",
        note, transactionHash, ledgerNumber, settlementId, requestId,
        status: transactionHash ? "Paid" : "Pending",
      }),
    });
    const data = await res.json();
    if (!data.success || !data.payment) {
      throw new Error(data.error || "Failed to create payment");
    }
    return data.payment as Payment;
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    transactionHash?: string,
    ledgerNumber?: number
  ): Promise<Payment> {
    const res = await fetch(`/api/payments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, transactionHash, ledgerNumber }),
    });
    const data = await res.json();
    if (!data.success || !data.payment) {
      throw new Error(data.error || "Failed to update payment status");
    }
    return data.payment as Payment;
  },
};
