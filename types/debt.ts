export type DebtStatus = "Pending" | "Ready";

export interface Debt {
  id: string;
  from: string; // Member wallet address or name
  to: string; // Member wallet address or name
  amount: number;
  currency: string;
  status: DebtStatus;
  createdAt: string;
}

export interface SettlementPlan {
  groupId: string;
  transactions: Debt[];
  totalTransactions: number;
  totalAmount: number;
  algorithmVersion: string;
  originalTransactionsCount: number;
  reductionPercentage: number;
}
