import { Member } from "./member";

export type SupportedCurrency = "USD" | "INR" | "EUR" | "GBP" | "XLM";

export interface Group {
  id: string;
  name: string;
  description: string;
  currency: SupportedCurrency;
  inviteCode?: string;
  ownerWallet: string;
  createdAt: string;
  updatedAt: string;
  members: Member[];
  totalExpenses: number;
  pendingBalance: number;
  status: "Active" | "Archived";
}
