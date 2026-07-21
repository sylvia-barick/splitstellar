import { SettlementPlan } from "@/types/debt";
import { calculateMinimumCashFlow } from "./minimumCashFlow";
import { Expense } from "@/types/expense";

interface MemberBalanceDetail {
  totalPaid: number;
  totalOwes: number;
  netBalance: number;
}

/**
 * settlementOptimizer
 * High-level helper to transform group balance maps and expenses into an optimized SettlementPlan.
 */
export function generateSettlementPlan(
  groupId: string,
  currency: string,
  balances: Record<string, MemberBalanceDetail>,
  expenses: Expense[] = []
): SettlementPlan {
  // Extract simple net balances map
  const netBalances: Record<string, number> = {};
  Object.entries(balances).forEach(([addr, bal]) => {
    netBalances[addr] = bal.netBalance;
  });

  // Calculate minimum cash flow transactions
  const transactions = calculateMinimumCashFlow(netBalances, currency);

  // Compute total settlement amount
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Compute raw/original transaction count from expenses
  let rawTxCount = 0;
  expenses.forEach((exp) => {
    exp.participants.forEach((part) => {
      if (
        part.walletAddress.toLowerCase() !== exp.paidBy.toLowerCase() &&
        part.shareAmount > 0
      ) {
        rawTxCount++;
      }
    });
  });

  // Fallback if no expenses provided but debts exist: upper bound pairwise connections
  if (rawTxCount === 0 && transactions.length > 0) {
    rawTxCount = Object.keys(balances).length * 2;
  }

  const simplifiedCount = transactions.length;
  let reductionPercentage = 0;
  if (rawTxCount > 0 && rawTxCount >= simplifiedCount) {
    reductionPercentage = Math.round(((rawTxCount - simplifiedCount) / rawTxCount) * 100);
  }

  return {
    groupId,
    transactions,
    totalTransactions: simplifiedCount,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    algorithmVersion: "Greedy-MinCashFlow-v1.0",
    originalTransactionsCount: rawTxCount,
    reductionPercentage,
  };
}
