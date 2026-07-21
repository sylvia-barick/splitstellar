import { NextResponse } from "next/server";
import { indexerService } from "@/services/indexerService";

export async function GET() {
  const status = indexerService.getStatus();
  return NextResponse.json({
    success: true,
    indexer: status,
    timestamp: new Date().toISOString(),
  });
}
