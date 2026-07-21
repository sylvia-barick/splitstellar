import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Expense } from "@/types/expense";
import { useGroupStore } from "./groupStore";
import { usePaymentStore } from "./paymentStore";
import { useRequestStore } from "./requestStore";
import { expenseRepository } from "@/services/expenseRepository";
import { notifySyncChannel } from "@/hooks/useServerSync";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { errorMonitor } from "@/lib/sentry";

interface ExpenseState {
  expenses: Expense[];
  syncWithServer: () => Promise<void>;
  createExpense: (expense: Omit<Expense, "id" | "createdAt" | "updatedAt">) => Promise<Expense>;
  updateExpense: (id: string, expenseData: Partial<Omit<Expense, "id" | "groupId" | "createdAt">>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  getExpense: (id: string) => Expense | undefined;
  getExpenses: () => Expense[];
  getExpensesByGroup: (groupId: string) => Expense[];
  calculateBalances: (
    groupId: string,
    memberAddresses?: string[]
  ) => Record<
    string,
    {
      totalPaid: number;
      totalOwes: number;
      netBalance: number;
    }
  >;
  getGroupSummary: (
    groupId: string,
    memberCount?: number
  ) => {
    totalExpenses: number;
    totalMembers: number;
    averageExpense: number;
    highestExpense: number;
    lowestExpense: number;
    recentExpense: Expense | null;
  };
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],

      syncWithServer: async () => {
        try {
          const fetched = await expenseRepository.fetchExpenses();
          set({ expenses: fetched });
        } catch (err) {
          console.error("Failed to sync expenses:", err);
        }
      },

      createExpense: async (expenseData) => {
        try {
          const newExpense = await expenseRepository.createExpense(expenseData);
          set((state) => ({
            expenses: [...state.expenses.filter((e) => e.id !== newExpense.id), newExpense],
          }));

          trackEvent({
            action: ANALYTICS_EVENTS.CREATE_EXPENSE,
            category: "expense",
            label: `${expenseData.title} (${expenseData.amount} ${expenseData.currency})`,
            value: expenseData.amount,
          });

          notifySyncChannel();
          return newExpense;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "createExpense", title: expenseData.title });
          throw err;
        }
      },

      updateExpense: async (id, expenseData) => {
        const updated = await expenseRepository.updateExpense(id, expenseData);
        set((state) => ({
          expenses: state.expenses.map((expense) => (expense.id === id ? updated : expense)),
        }));

        notifySyncChannel();
        return updated;
      },

      deleteExpense: async (id) => {
        try {
          await expenseRepository.deleteExpense(id);

          trackEvent({
            action: "delete_expense",
            category: "expense",
            label: id,
          });
        } catch (err) {
          console.warn("deleteExpense repo notice:", err);
          errorMonitor.captureException(err, "backend", { action: "deleteExpense", id });
        }
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));

        notifySyncChannel();
      },

      getExpense: (id) => {
        return get().expenses.find((expense) => expense.id === id);
      },

      getExpenses: () => {
        return get().expenses;
      },

      getExpensesByGroup: (groupId) => {
        return get().expenses.filter((expense) => expense.groupId === groupId);
      },

      calculateBalances: (groupId, memberAddresses) => {
        const groupExpenses = get().getExpensesByGroup(groupId);
        
        let addresses = memberAddresses;
        if (!addresses || addresses.length === 0) {
          const group = useGroupStore.getState().getGroup(groupId);
          if (group) {
            addresses = group.members.map((m) => m.walletAddress);
          } else {
            const addrSet = new Set<string>();
            groupExpenses.forEach((exp) => {
              addrSet.add(exp.paidBy);
              exp.participants.forEach((p) => addrSet.add(p.walletAddress));
            });
            addresses = Array.from(addrSet);
          }
        }
        
        const balanceMap: Record<string, { totalPaid: number; totalOwes: number; netBalance: number }> = {};
        addresses.forEach((addr) => {
          balanceMap[addr.toLowerCase()] = {
            totalPaid: 0,
            totalOwes: 0,
            netBalance: 0,
          };
        });

        // 1. Compute balances from expenses
        groupExpenses.forEach((exp) => {
          const payerKey = exp.paidBy.toLowerCase();
          
          if (balanceMap[payerKey]) {
            balanceMap[payerKey].totalPaid += exp.amount;
          }

          exp.participants.forEach((part) => {
            const partKey = part.walletAddress.toLowerCase();
            if (balanceMap[partKey]) {
              balanceMap[partKey].totalOwes += part.shareAmount;
            }
          });
        });

        // 2. Compute balances from Direct Loans & Money Requests
        const groupRequests = useRequestStore.getState().getRequestsByGroup(groupId);
        const groupPayments = usePaymentStore.getState().getPaymentsByGroup(groupId);
        const paymentReqIds = new Set(groupPayments.map((p) => p.requestId).filter(Boolean));

        groupRequests.forEach((req) => {
          if (req.type === "DirectLoan") {
            if (req.status === "Accepted" || req.status === "Paid" || req.status === "Completed") {
              const lenderKey = req.from.toLowerCase();
              const borrowerKey = req.to.toLowerCase();

              if (balanceMap[lenderKey]) {
                balanceMap[lenderKey].totalPaid += req.amount;
              }
              if (balanceMap[borrowerKey]) {
                balanceMap[borrowerKey].totalOwes += req.amount;
              }
            }
          } else if (req.type === "Request") {
            // Only count paid money requests if they don't already have a corresponding Payment record
            if ((req.status === "Paid" || req.status === "Completed") && !paymentReqIds.has(req.id)) {
              const payerKey = req.to.toLowerCase();
              const requesterKey = req.from.toLowerCase();

              if (balanceMap[payerKey]) {
                balanceMap[payerKey].totalPaid += req.amount;
              }
              if (balanceMap[requesterKey]) {
                balanceMap[requesterKey].totalOwes += req.amount;
              }
            }
          }
        });

        // 3. Compute balances from On-Chain Payments & Repayments
        groupPayments.forEach((pay) => {
          if (pay.status === "Paid" || pay.status === "Completed" || pay.status === "Confirmed") {
            const payerKey = pay.from.toLowerCase();
            const receiverKey = pay.to.toLowerCase();

            if (balanceMap[payerKey]) {
              balanceMap[payerKey].totalPaid += pay.amount;
            }
            if (balanceMap[receiverKey]) {
              balanceMap[receiverKey].totalOwes += pay.amount;
            }
          }
        });

        Object.keys(balanceMap).forEach((key) => {
          balanceMap[key].netBalance = balanceMap[key].totalPaid - balanceMap[key].totalOwes;
        });

        return balanceMap;
      },

      getGroupSummary: (groupId, memberCount) => {
        const groupExpenses = get().getExpensesByGroup(groupId);
        const totalExpenses = groupExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        let count = memberCount;
        if (count === undefined) {
          const group = useGroupStore.getState().getGroup(groupId);
          if (group) {
            count = group.members.length;
          } else {
            const addrSet = new Set<string>();
            groupExpenses.forEach((exp) => {
              addrSet.add(exp.paidBy);
              exp.participants.forEach((p) => addrSet.add(p.walletAddress));
            });
            count = addrSet.size;
          }
        }
        
        let highestExpense = 0;
        let lowestExpense = groupExpenses.length > 0 ? Infinity : 0;
        let recentExpense: Expense | null = null;

        groupExpenses.forEach((exp) => {
          if (exp.amount > highestExpense) {
            highestExpense = exp.amount;
          }
          if (exp.amount < lowestExpense) {
            lowestExpense = exp.amount;
          }
          if (!recentExpense || new Date(exp.createdAt).getTime() > new Date(recentExpense.createdAt).getTime()) {
            recentExpense = exp;
          }
        });

        if (lowestExpense === Infinity) {
          lowestExpense = 0;
        }

        const averageExpense = groupExpenses.length > 0 ? totalExpenses / groupExpenses.length : 0;

        return {
          totalExpenses,
          totalMembers: count,
          averageExpense,
          highestExpense,
          lowestExpense,
          recentExpense,
        };
      },
    }),
    {
      name: "splitstellar-expense-store",
    }
  )
);
