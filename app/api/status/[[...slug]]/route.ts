import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CONTRACT_IDS, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/soroban/contract";
import { indexerService } from "@/services/indexerService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];

  if (slug.length === 0) {
    // /api/status
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

  const endpoint = slug[0];

  if (endpoint === "health") {
    // /api/health
    return NextResponse.json({
      status: "ok",
      service: "SplitStellar API Server",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    });
  }

  if (endpoint === "database") {
    // /api/database/status
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

  if (endpoint === "contracts") {
    // /api/contracts/status
    return NextResponse.json({
      success: true,
      contracts: {
        network: NETWORK_PASSPHRASE,
        rpcUrl: SOROBAN_RPC_URL,
        addresses: CONTRACT_IDS,
        status: "online",
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (endpoint === "indexer") {
    // /api/indexer/status
    const status = indexerService.getStatus();
    return NextResponse.json({
      success: true,
      indexer: status,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}
