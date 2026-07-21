import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "SplitStellar API Server",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
}
