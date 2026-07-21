import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Mock seed route disabled. SplitStellar is running fully on Soroban Smart Contracts.",
  });
}
