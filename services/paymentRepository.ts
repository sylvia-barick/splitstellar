import { Payment, PaymentStatus } from "@/types/payment";
import { recordPaymentOnChain, fetchGroupSettlementsOnChain } from "@/lib/soroban/settlement";
import { isSupabaseConfigured } from "@/lib/supabase";

export const paymentRepository = {
  async fetchPayments(groupId?: string): Promise<Payment[]> {
    if (groupId) {
      try {
        const chainPay = await fetchGroupSettlementsOnChain(groupId);
        if (chainPay.length > 0) return chainPay;
      } catch (err) {
        console.warn("Soroban fetchGroupSettlements notice:", err);
      }
    }

    // Always try the REST API first (works on Vercel)
    try {
      const params = new URLSearchParams();
      if (groupId) params.append("groupId", groupId);
      const url = `/api/payments${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          return data.payments;
        }
      }
    } catch (err) {
      console.warn("API fetchPayments notice:", err);
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("splitstellar-payment-store");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.payments && Array.isArray(parsed.state.payments)) {
            const payments = parsed.state.payments as Payment[];
            if (groupId) {
              return payments.filter((p) => p.groupId === groupId);
            }
            return payments;
          }
        }
      } catch {}
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
    let payment: Payment;
    try {
      payment = await recordPaymentOnChain(
        { groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId },
        from
      );
    } catch (e) {
      console.warn("Soroban recordPaymentOnChain notice:", e);
      const now = new Date().toISOString();
      payment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        groupId,
        from,
        to,
        amount,
        currency: currency || "XLM",
        status: transactionHash ? "Paid" : "Pending",
        note,
        transactionHash,
        ledgerNumber,
        settlementId,
        requestId,
        createdAt: now,
        updatedAt: now,
      };
    }

    try {
      const res = await fetch(`/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payment,
          status: transactionHash ? "Paid" : payment.status || "Pending",
        }),
      });
      const data = await res.json();
      if (data.success && data.payment) {
        return data.payment;
      }
    } catch {
      // Local sync fallback
    }

    return payment;
  },

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    transactionHash?: string,
    ledgerNumber?: number
  ): Promise<Payment> {
    try {
      const res = await fetch(`/api/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, transactionHash, ledgerNumber }),
      });
      const data = await res.json();
      if (data.success && data.payment) {
        return data.payment;
      }
    } catch (e) {
      console.warn("API updatePaymentStatus notice:", e);
    }

    const { usePaymentStore } = await import("@/stores/paymentStore");
    const current = usePaymentStore.getState().payments.find((p) => p.id === id);
    const now = new Date().toISOString();

    return {
      ...(current || {
        id,
        groupId: "",
        from: "",
        to: "",
        amount: 0,
        currency: "XLM",
        createdAt: now,
      }),
      status,
      updatedAt: now,
      transactionHash: transactionHash || current?.transactionHash,
      ledgerNumber: ledgerNumber !== undefined ? ledgerNumber : current?.ledgerNumber,
    };
  },
};
