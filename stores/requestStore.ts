import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MoneyRequest } from "@/types/payment";
import { requestRepository } from "@/services/requestRepository";
import { notifySyncChannel } from "@/hooks/useServerSync";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { errorMonitor } from "@/lib/sentry";

interface RequestState {
  requests: MoneyRequest[];
  syncWithServer: () => Promise<void>;
  createMoneyRequest: (
    groupId: string,
    from: string,
    to: string,
    amount: number,
    currency: string,
    note?: string
  ) => Promise<MoneyRequest>;
  createDirectLoan: (
    groupId: string,
    lender: string,
    borrower: string,
    amount: number,
    currency: string,
    note?: string
  ) => Promise<MoneyRequest>;
  respondToRequest: (id: string, accept: boolean) => Promise<void>;
  markRequestAsPaid: (id: string) => Promise<void>;
  markRequestAsPaidWithTx: (id: string, transactionHash: string, ledgerNumber?: number) => Promise<MoneyRequest>;
  returnRequestedMoney: (id: string, returnTxHash: string, ledgerNumber?: number) => Promise<MoneyRequest>;
  confirmRequestReceipt: (id: string) => Promise<void>;
  getRequestsByGroup: (groupId: string) => MoneyRequest[];
  getRequestsByMember: (walletAddress: string) => MoneyRequest[];
}

export const useRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requests: [],

      syncWithServer: async () => {
        try {
          const fetched = await requestRepository.fetchRequests();
          set({ requests: fetched });
        } catch (err) {
          console.error("Failed to sync requests:", err);
        }
      },

      createMoneyRequest: async (groupId, from, to, amount, currency, note) => {
        try {
          const newReq = await requestRepository.createRequest(groupId, from, to, amount, currency, note, "Request");
          set((state) => ({
            requests: [...state.requests.filter((r) => r.id !== newReq.id), newReq],
          }));

          trackEvent({
            action: ANALYTICS_EVENTS.MONEY_REQUEST,
            category: "request",
            label: `${from} requested from ${to}: ${amount} ${currency}`,
            value: amount,
          });

          notifySyncChannel();
          return newReq;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "createMoneyRequest", groupId, amount });
          throw err;
        }
      },

      createDirectLoan: async (groupId, lender, borrower, amount, currency, note) => {
        try {
          const newLoan = await requestRepository.createRequest(groupId, lender, borrower, amount, currency, note, "DirectLoan");
          set((state) => ({
            requests: [...state.requests.filter((r) => r.id !== newLoan.id), newLoan],
          }));

          trackEvent({
            action: "create_direct_loan",
            category: "request",
            label: `${lender} loaned ${borrower}: ${amount} ${currency}`,
            value: amount,
          });

          notifySyncChannel();
          return newLoan;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "createDirectLoan", groupId, amount });
          throw err;
        }
      },

      respondToRequest: async (id, accept) => {
        try {
          const updated = await requestRepository.updateRequestStatus(id, accept ? "Accepted" : "Rejected");
          set((state) => ({
            requests: state.requests.map((r) => (r.id === id ? updated : r)),
          }));

          trackEvent({
            action: ANALYTICS_EVENTS.RESPOND_REQUEST,
            category: "request",
            label: `${id} -> ${accept ? "Accepted" : "Rejected"}`,
          });

          notifySyncChannel();
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "respondToRequest", id, accept });
          throw err;
        }
      },

      markRequestAsPaid: async (id) => {
        const updated = await requestRepository.updateRequestStatus(id, "Paid");
        set((state) => ({
          requests: state.requests.map((r) => (r.id === id ? updated : r)),
        }));

        notifySyncChannel();
      },

      markRequestAsPaidWithTx: async (id, transactionHash, ledgerNumber) => {
        const updated = await requestRepository.updateRequestStatus(id, "Paid", transactionHash, ledgerNumber);
        set((state) => ({
          requests: state.requests.map((r) => (r.id === id ? updated : r)),
        }));

        notifySyncChannel();
        return updated;
      },

      returnRequestedMoney: async (id, returnTxHash, ledgerNumber) => {
        try {
          const updated = await requestRepository.updateRequestStatus(id, "Completed", undefined, ledgerNumber, returnTxHash);
          set((state) => ({
            requests: state.requests.map((r) => (r.id === id ? updated : r)),
          }));

          trackEvent({
            action: ANALYTICS_EVENTS.RETURN_MONEY,
            category: "request",
            label: id,
          });

          notifySyncChannel();
          return updated;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "returnRequestedMoney", id });
          throw err;
        }
      },

      confirmRequestReceipt: async (id) => {
        const updated = await requestRepository.updateRequestStatus(id, "Completed");
        set((state) => ({
          requests: state.requests.map((r) => (r.id === id ? updated : r)),
        }));

        notifySyncChannel();
      },

      getRequestsByGroup: (groupId) => {
        return get().requests.filter((r) => r.groupId === groupId);
      },

      getRequestsByMember: (walletAddress) => {
        const lower = walletAddress.toLowerCase();
        return get().requests.filter(
          (r) => r.from.toLowerCase() === lower || r.to.toLowerCase() === lower
        );
      },
    }),
    {
      name: "splitstellar-request-store",
    }
  )
);
