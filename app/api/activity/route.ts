import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { ActivityItem } from "@/types/payment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const address = searchParams.get("address");

  const db = getDb();
  let activities = db.activities;

  if (groupId) {
    activities = activities.filter((a) => a.groupId === groupId);
  }

  if (address) {
    const lower = address.toLowerCase();
    activities = activities.filter((a) => a.actorAddress.toLowerCase() === lower);
  }

  return NextResponse.json({ success: true, activities });
}

export async function POST(request: NextRequest) {
  try {
    const { groupId, actorAddress, actorName, type, description, amount, currency } = await request.json();
    const db = getDb();

    const newAct: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      actorAddress,
      actorName,
      type,
      description,
      amount,
      currency,
      createdAt: new Date().toISOString(),
    };

    db.activities.unshift(newAct);
    saveDb(db);

    return NextResponse.json({ success: true, activity: newAct });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to record activity" },
      { status: 500 }
    );
  }
}
