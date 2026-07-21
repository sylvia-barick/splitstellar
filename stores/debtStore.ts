import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SettlementPlan } from "@/types/debt";
import { generateSettlementPlan } from "@/utils/settlementOptimizer";
import { Expense } from "@/types/expense";

interface DebtState {
  plans: Record<string, SettlementPlan>; // Keyed by groupId
  calculateSettlementPlan: (
    groupId: string,
    currency: string,
    balances: Record<string, { totalPaid: number; totalOwes: number; netBalance: number }>,
    expenses?: Expense[]
  ) => SettlementPlan;
  getSettlementPlan: (groupId: string) => SettlementPlan | undefined;
  clearSettlementPlan: (groupId: string) => void;
  recalculateSettlement: (
    groupId: string,
    currency: string,
    balances: Record<string, { totalPaid: number; totalOwes: number; netBalance: number }>,
    expenses?: Expense[]
  ) => SettlementPlan;
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set, get) => ({
      plans: {},

      calculateSettlementPlan: (groupId, currency, balances, expenses = []) => {
        const plan = generateSettlementPlan(groupId, currency, balances, expenses);
        set((state) => ({
          plans: {
            ...state.plans,
            [groupId]: plan,
          },
        }));
        return plan;
      },

      getSettlementPlan: (groupId) => {
        return get().plans[groupId];
      },

      clearSettlementPlan: (groupId) => {
        set((state) => {
          const newPlans = { ...state.plans };
          delete newPlans[groupId];
          return { plans: newPlans };
        });
      },

      recalculateSettlement: (groupId, currency, balances, expenses = []) => {
        return get().calculateSettlementPlan(groupId, currency, balances, expenses);
      },
    }),
    {
      name: "splitstellar-debt-store",
    }
  )
);
