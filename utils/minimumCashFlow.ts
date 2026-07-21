import { Debt } from "@/types/debt";
import { validateBalances } from "./balanceCalculator";

export interface MemberBalanceNode {
  address: string;
  amount: number; // Positive = Creditor, Negative = Debtor
}

/**
 * Minimum Cash Flow Greedy Algorithm
 * Simplifies a network of net debts into the minimum number of direct transactions.
 * Time Complexity: O(N log N) with priority/sorting iteration.
 */
export function calculateMinimumCashFlow(
  netBalances: Record<string, number>,
  currency: string
): Debt[] {
  // 1. Clone net balances and balance decimal precision differences safely
  const balancedMap: Record<string, number> = { ...netBalances };
  validateBalances(balancedMap);

  // 2. Separate into active creditors and debtors
  const creditors: MemberBalanceNode[] = [];
  const debtors: MemberBalanceNode[] = [];

  Object.entries(balancedMap).forEach(([address, netAmt]) => {
    // Round to 2 decimal places to eliminate IEEE 754 precision issues
    const rounded = Math.round(netAmt * 100) / 100;
    if (rounded > 0.001) {
      creditors.push({ address, amount: rounded });
    } else if (rounded < -0.001) {
      debtors.push({ address, amount: Math.abs(rounded) });
    }
  });

  const transactions: Debt[] = [];
  const now = new Date().toISOString();
  let txCounter = 1;

  // 3. Iteratively pair largest debtor with largest creditor
  while (debtors.length > 0 && creditors.length > 0) {
    // Sort debtors descending by amount owed
    debtors.sort((a, b) => b.amount - a.amount);
    // Sort creditors descending by amount receiving
    creditors.sort((a, b) => b.amount - a.amount);

    const maxDebtor = debtors[0];
    const maxCreditor = creditors[0];

    const settlementAmount = Math.min(maxDebtor.amount, maxCreditor.amount);
    const roundedAmount = Math.round(settlementAmount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        id: `debt-${Date.now()}-${txCounter++}`,
        from: maxDebtor.address,
        to: maxCreditor.address,
        amount: roundedAmount,
        currency: currency || "XLM",
        status: "Ready",
        createdAt: now,
      });

      maxDebtor.amount = Math.round((maxDebtor.amount - roundedAmount) * 100) / 100;
      maxCreditor.amount = Math.round((maxCreditor.amount - roundedAmount) * 100) / 100;
    }

    // Remove settled members (balance < 0.001)
    if (maxDebtor.amount <= 0.001) {
      debtors.shift();
    }
    if (maxCreditor.amount <= 0.001) {
      creditors.shift();
    }
  }

  return transactions;
}
