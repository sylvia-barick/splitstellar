import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Payment } from "@/types/payment";
import { paymentRepository } from "@/services/paymentRepository";
import { notifySyncChannel } from "@/hooks/useServerSync";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { errorMonitor } from "@/lib/sentry";

interface PaymentState {
  payments: Payment[];
  syncWithServer: () => Promise<void>;
  createPayment: (
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
  ) => Promise<Payment>;
  markAsPaid: (id: string, transactionHash?: string, ledgerNumber?: number) => Promise<void>;
  confirmReceipt: (id: string, transactionHash?: string, ledgerNumber?: number) => Promise<void>;
  getPaymentsByGroup: (groupId: string) => Payment[];
  getPaymentsByMember: (walletAddress: string) => Payment[];
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      payments: [],

      syncWithServer: async () => {
        try {
          const fetched = await paymentRepository.fetchPayments();
          set({ payments: fetched });
        } catch (err) {
          console.error("Failed to sync payments:", err);
        }
      },

      createPayment: async (groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId) => {
        try {
          const newPayment = await paymentRepository.createPayment(groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId);
          set((state) => ({
            payments: [...state.payments.filter((p) => p.id !== newPayment.id), newPayment],
          }));

          trackEvent({
            action: ANALYTICS_EVENTS.SETTLE_EXPENSE,
            category: "settlement",
            label: `${from} -> ${to}: ${amount} ${currency}`,
            value: amount,
          });

          notifySyncChannel();
          return newPayment;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "createPayment", groupId, amount });
          throw err;
        }
      },

      markAsPaid: async (id, transactionHash, ledgerNumber) => {
        try {
          const updated = await paymentRepository.updatePaymentStatus(id, "Paid", transactionHash, ledgerNumber);
          set((state) => ({
            payments: state.payments.map((p) => (p.id === id ? updated : p)),
          }));

          trackEvent({
            action: "mark_as_paid",
            category: "settlement",
            label: id,
          });

          notifySyncChannel();
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "markAsPaid", id });
          throw err;
        }
      },

      confirmReceipt: async (id, transactionHash, ledgerNumber) => {
        try {
          const updated = await paymentRepository.updatePaymentStatus(id, "Completed", transactionHash, ledgerNumber);
          set((state) => ({
            payments: state.payments.map((p) => (p.id === id ? updated : p)),
          }));

          trackEvent({
            action: "confirm_receipt",
            category: "settlement",
            label: id,
          });

          notifySyncChannel();
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "confirmReceipt", id });
          throw err;
        }
      },

      getPaymentsByGroup: (groupId) => {
        return get().payments.filter((p) => p.groupId === groupId);
      },

      getPaymentsByMember: (walletAddress) => {
        const lower = walletAddress.toLowerCase();
        return get().payments.filter(
          (p) => p.from.toLowerCase() === lower || p.to.toLowerCase() === lower
        );
      },
    }),
    {
      name: "splitstellar-payment-store",
    }
  )
);
