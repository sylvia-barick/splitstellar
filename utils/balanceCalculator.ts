/**
 * Validates and balances member net balances.
 * The sum of all net balances in a group must equal 0.
 * Eliminates floating point rounding errors (e.g., 33.33 * 3 = 99.99, sum = 0.01).
 * Automatically assigns micro-imbalances to the largest creditor and never crashes the UI.
 */
export function validateBalances(netBalances: Record<string, number>): void {
  const keys = Object.keys(netBalances);
  if (keys.length === 0) return;

  // 1. Round all balances to 2 decimal places
  keys.forEach((key) => {
    netBalances[key] = Math.round(netBalances[key] * 100) / 100;
  });

  // 2. Compute total sum of rounded balances
  const total = keys.reduce((sum, key) => sum + netBalances[key], 0);
  const roundedTotal = Math.round(total * 100) / 100;

  // 3. If there is a rounding imbalance (e.g. +0.01 or -0.01), absorb into largest creditor
  if (Math.abs(roundedTotal) > 0) {
    let largestCreditorKey: string | null = null;
    let maxCredit = -Infinity;

    keys.forEach((key) => {
      if (netBalances[key] > maxCredit) {
        maxCredit = netBalances[key];
        largestCreditorKey = key;
      }
    });

    if (largestCreditorKey) {
      netBalances[largestCreditorKey] =
        Math.round((netBalances[largestCreditorKey] - roundedTotal) * 100) / 100;
    }
  }
}
