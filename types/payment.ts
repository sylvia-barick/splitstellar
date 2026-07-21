export type PaymentStatus = "Pending" | "Paid" | "Confirmed" | "Completed" | "Failed";

export interface Payment {
  id: string;
  settlementId?: string;
  requestId?: string;
  groupId: string;
  from: string; // Debtor wallet address
  to: string; // Creditor wallet address
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
  transactionHash?: string;
  ledgerNumber?: number;
}

export type RequestType = "Request" | "DirectLoan";
export type RequestStatus = "Pending" | "Accepted" | "Rejected" | "Paid" | "Completed";

export interface MoneyRequest {
  id: string;
  groupId: string;
  from: string; // Wallet address of person making request or lender
  to: string; // Wallet address of person owing money or borrower
  amount: number;
  currency: string;
  note?: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  transactionHash?: string;
  ledgerNumber?: number;
  returnTxHash?: string;
}

export type ActivityType =
  | "ExpenseAdded"
  | "ExpenseEdited"
  | "ExpenseDeleted"
  | "PaymentPaid"
  | "PaymentConfirmed"
  | "DirectLoanCreated"
  | "RequestCreated"
  | "RequestAccepted"
  | "RequestRejected"
  | "MemberJoined";

export interface ActivityItem {
  id: string;
  groupId: string;
  actorAddress: string;
  actorName: string;
  type: ActivityType;
  description: string;
  amount?: number;
  currency?: string;
  createdAt: string;
}
