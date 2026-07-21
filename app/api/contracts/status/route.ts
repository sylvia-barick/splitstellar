import { NextResponse } from "next/server";
import { CONTRACT_IDS, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/soroban/contract";

export async function GET() {
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
