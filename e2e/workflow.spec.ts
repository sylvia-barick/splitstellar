import { describe, it, expect } from "vitest";

// The debt simplification routine matching the logic in GraphView.tsx
interface Balance {
  addr: string;
  amount: number;
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export function simplifyDebts(netBalances: Record<string, number>): Transfer[] {
  const debtors: Balance[] = [];
  const creditors: Balance[] = [];

  Object.entries(netBalances).forEach(([addr, net]) => {
    if (net < -0.01) {
      debtors.push({ addr, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ addr, amount: net });
    }
  });

  const transfers: Transfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const d = debtors[dIdx];
    const c = creditors[cIdx];
    const transferAmount = Math.min(d.amount, c.amount);

    if (transferAmount > 0.01) {
      transfers.push({
        from: d.addr,
        to: c.addr,
        amount: parseFloat(transferAmount.toFixed(2)),
      });
    }

    d.amount -= transferAmount;
    c.amount -= transferAmount;

    if (d.amount <= 0.01) dIdx++;
    if (c.amount <= 0.01) cIdx++;
  }

  return transfers;
}

describe("SplitStellar Debt Simplification Engine", () => {
  it("should simplify a 3-way circular debt flow into a single direct settlement", () => {
    // Scenario:
    // A paid 300 XLM for A, B, C (3-way equal split -> each share 100)
    // A net: +200, B net: -100, C net: -100
    // B paid 150 XLM for A, B, C (3-way equal split -> each share 50)
    // B net: +100 - 100 = 0
    // A net: 200 - 50 = +150
    // C net: -100 - 50 = -150
    const netBalances = {
      "user-a": 150.00,
      "user-b": 0.00,
      "user-c": -150.00,
    };

    const transfers = simplifyDebts(netBalances);

    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual({
      from: "user-c",
      to: "user-a",
      amount: 150.00,
    });
  });

  it("should simplify a complex multi-party debt group accurately", () => {
    // Scenario:
    // Alice owes 50
    // Bob owes 100
    // Charlie is owed 80
    // David is owed 70
    const netBalances = {
      "alice": -50.00,
      "bob": -100.00,
      "charlie": 80.00,
      "david": 70.00,
    };

    const transfers = simplifyDebts(netBalances);

    // Expect Alice and Bob's debts to satisfy Charlie and David
    // Alice owes 50 -> Charlie gets 50
    // Bob owes 100 -> Charlie gets remaining 30, David gets 70
    expect(transfers).toHaveLength(3);
    
    expect(transfers[0]).toEqual({
      from: "alice",
      to: "charlie",
      amount: 50.00,
    });
    expect(transfers[1]).toEqual({
      from: "bob",
      to: "charlie",
      amount: 30.00,
    });
    expect(transfers[2]).toEqual({
      from: "bob",
      to: "david",
      amount: 70.00,
    });
  });
});

