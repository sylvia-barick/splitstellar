import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, AppNotification } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  const db = await getDb();
  let notifications = db.notifications;

  if (wallet) {
    const lower = wallet.toLowerCase();
    notifications = notifications.filter(
      (n) => n.walletAddress.toLowerCase() === lower || n.walletAddress === "global"
    );
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ success: true, unreadCount, notifications });
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, type, title, message, metadata } = await request.json();
    const db = await getDb();
    const now = new Date().toISOString();

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      walletAddress: walletAddress || "global",
      type: type || "System",
      title,
      message,
      read: false,
      createdAt: now,
      metadata,
    };

    db.notifications.unshift(newNotif);
    await saveDb(db);

    return NextResponse.json({ success: true, notification: newNotif });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, markAllRead, walletAddress } = await request.json();
    const db = await getDb();

    if (markAllRead && walletAddress) {
      const lower = walletAddress.toLowerCase();
      db.notifications.forEach((n) => {
        if (n.walletAddress.toLowerCase() === lower || n.walletAddress === "global") {
          n.read = true;
        }
      });
    } else if (id) {
      const index = db.notifications.findIndex((n) => n.id === id);
      if (index !== -1) db.notifications[index].read = true;
    }

    await saveDb(db);
    return NextResponse.json({ success: true, notifications: db.notifications });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update notification" },
      { status: 500 }
    );
  }
}
