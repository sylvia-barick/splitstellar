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

        // balanceMap tracks each member's net position:
        //   netBalance > 0  → they are owed money (creditor)
        //   netBalance < 0  → they owe money (debtor)
        const netMap: Record<string, number> = {};
        addresses.forEach((addr) => {
          netMap[addr.toLowerCase()] = 0;
        });

        // ── Step 1: Expenses ────────────────────────────────────────────────
        // The payer fronted the full amount → they gain credit for the shares
        // of everyone else. Each participant owes their own share back to the payer.
        groupExpenses.forEach((exp) => {
          const payerKey = exp.paidBy.toLowerCase();
          exp.participants.forEach((part) => {
            const partKey = part.walletAddress.toLowerCase();
            if (partKey === payerKey) return; // payer owes themselves nothing
            // participant owes shareAmount to payer
            if (netMap[partKey] !== undefined) netMap[partKey] -= part.shareAmount;
            if (netMap[payerKey] !== undefined) netMap[payerKey] += part.shareAmount;
          });
        });

        // ── Step 2: Settlement payments (debt repayments) ───────────────────
        // When A sends 100 to owner as a settlement, A's debt decreases by 100
        // and owner's credit decreases by 100. This is the opposite of an expense.
        const groupPayments = usePaymentStore.getState().getPaymentsByGroup(groupId);
        groupPayments.forEach((pay) => {
          if (pay.status === "Paid" || pay.status === "Completed" || pay.status === "Confirmed") {
            const payerKey = pay.from.toLowerCase();
            const receiverKey = pay.to.toLowerCase();
            // payer is settling their debt → their net goes up (less negative)
            if (netMap[payerKey] !== undefined) netMap[payerKey] += pay.amount;
            // receiver has been repaid → their net goes down (less positive)
            if (netMap[receiverKey] !== undefined) netMap[receiverKey] -= pay.amount;
          }
        });

        // ── Step 3: Direct Loans ────────────────────────────────────────────
        // Lender gives money to borrower → lender gains credit, borrower owes
        const groupRequests = useRequestStore.getState().getRequestsByGroup(groupId);
        groupRequests.forEach((req) => {
          if (req.type === "DirectLoan") {
            if (req.status === "Accepted" || req.status === "Paid") {
              const lenderKey = req.from.toLowerCase();
              const borrowerKey = req.to.toLowerCase();
              if (netMap[lenderKey] !== undefined) netMap[lenderKey] += req.amount;
              if (netMap[borrowerKey] !== undefined) netMap[borrowerKey] -= req.amount;
            } else if (req.status === "Completed") {
              // Loan fully repaid — no net effect (already settled via payment record)
            }
          }
          // Money requests (type === "Request") are purely informational payment
          // triggers. The actual fund movement is captured in the Payment record
          // above (step 2), so we do NOT double-count them here.
        });

        // ── Build final balance map ─────────────────────────────────────────
        const balanceMap: Record<string, { totalPaid: number; totalOwes: number; netBalance: number }> = {};
        addresses.forEach((addr) => {
          const key = addr.toLowerCase();
          const net = netMap[key] ?? 0;
          balanceMap[key] = {
            // Expose totalPaid / totalOwes for backward compat with UI cards
            totalPaid: net > 0 ? net : 0,
            totalOwes: net < 0 ? Math.abs(net) : 0,
            netBalance: net,
          };
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
