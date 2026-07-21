import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.0.0",
    appName: "SplitStellar",
    environment: process.env.NODE_ENV || "development",
    network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet",
    buildTime: "2026-07-21T21:45:00Z",
  });
}
