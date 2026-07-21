export type ExpenseCategory =
  | "Food"
  | "Travel"
  | "Rent"
  | "Shopping"
  | "Utilities"
  | "Entertainment"
  | "Others";

export type SplitType = "Equal" | "Percentage" | "Custom" | "Shares";

export interface Participant {
  walletAddress: string;
  memberName: string;
  shareAmount: number;
  sharePercentage: number;
  isPaid: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string; // wallet address of payer
  participants: Participant[];
  splitType: SplitType;
  category: ExpenseCategory;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
