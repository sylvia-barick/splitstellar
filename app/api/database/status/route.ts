import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    success: true,
    database: {
      status: "connected",
      storageType: "JSON Persistent Store",
      recordCounts: {
        users: db.users.length,
        groups: db.groups.length,
        expenses: db.expenses.length,
        payments: db.payments.length,
        requests: db.requests.length,
        activities: db.activities.length,
        notifications: db.notifications.length,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
