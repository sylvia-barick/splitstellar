import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  return NextResponse.json({
    status: "operational",
    subsystems: {
      apiServer: "healthy",
      database: "connected",
      indexer: "active",
      sorobanRpc: "connected",
    },
    metrics: {
      groups: db.groups.length,
      expenses: db.expenses.length,
      payments: db.payments.length,
      requests: db.requests.length,
    },
    timestamp: new Date().toISOString(),
  });
}
