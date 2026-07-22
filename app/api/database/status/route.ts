import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const db = await getDb();
  return NextResponse.json({
    success: true,
    database: {
      status: "connected",
      storageType: isSupabaseConfigured ? "Supabase (production)" : "Local JSON (development)",
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
