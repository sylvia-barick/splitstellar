import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({
      success: true,
      results: {
        groups: [],
        expenses: [],
        payments: [],
        requests: [],
        members: [],
      },
    });
  }

  const db = getDb();

  // Search Groups
  const matchingGroups = db.groups.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q) ||
      (g.inviteCode || "").toLowerCase().includes(q)
  );

  // Search Expenses
  const matchingExpenses = db.expenses.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.paidBy.toLowerCase().includes(q)
  );

  // Search Payments / Transactions
  const matchingPayments = db.payments.filter(
    (p) =>
      p.id.toLowerCase().includes(q) ||
      p.from.toLowerCase().includes(q) ||
      p.to.toLowerCase().includes(q) ||
      p.transactionHash?.toLowerCase().includes(q) ||
      p.note?.toLowerCase().includes(q)
  );

  // Search Money Requests
  const matchingRequests = db.requests.filter(
    (r) =>
      r.id.toLowerCase().includes(q) ||
      r.from.toLowerCase().includes(q) ||
      r.to.toLowerCase().includes(q) ||
      r.note?.toLowerCase().includes(q) ||
      r.transactionHash?.toLowerCase().includes(q)
  );

  // Extract matching members
  const memberSet = new Map<string, { walletAddress: string; name: string; groupName: string }>();
  db.groups.forEach((g) => {
    g.members.forEach((m) => {
      if (
        m.name.toLowerCase().includes(q) ||
        m.walletAddress.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
      ) {
        memberSet.set(m.walletAddress.toLowerCase(), {
          walletAddress: m.walletAddress,
          name: m.name,
          groupName: g.name,
        });
      }
    });
  });

  return NextResponse.json({
    success: true,
    query: q,
    results: {
      groups: matchingGroups,
      expenses: matchingExpenses,
      payments: matchingPayments,
      requests: matchingRequests,
      members: Array.from(memberSet.values()),
    },
  });
}
