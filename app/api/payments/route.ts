import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { Payment } from "@/types/payment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const address = searchParams.get("address");

  const db = await getDb();
  let payments = db.payments;

  if (groupId) {
    payments = payments.filter((p) => p.groupId === groupId);
  }

  if (address) {
    const lower = address.toLowerCase();
    payments = payments.filter(
      (p) => p.from.toLowerCase() === lower || p.to.toLowerCase() === lower
    );
  }

  return NextResponse.json({ success: true, payments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId, status } = body;
    const db = await getDb();
    const now = new Date().toISOString();

    const newPayment: Payment = {
      id: id || `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      settlementId,
      requestId,
      groupId,
      from,
      to,
      amount,
      currency: currency || "XLM",
      status: status || (transactionHash ? "Paid" : "Pending"),
      createdAt: now,
      updatedAt: now,
      note,
      transactionHash,
      ledgerNumber,
    };

    const existingIdx = db.payments.findIndex((p) => p.id === newPayment.id);
    if (existingIdx >= 0) {
      db.payments[existingIdx] = newPayment;
    } else {
      db.payments.push(newPayment);
    }
    await saveDb(db);

    return NextResponse.json({ success: true, payment: newPayment });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, transactionHash, ledgerNumber } = await request.json();
    const db = await getDb();
    const now = new Date().toISOString();

    const index = db.payments.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    db.payments[index].status = status;
    if (transactionHash) db.payments[index].transactionHash = transactionHash;
    if (ledgerNumber !== undefined) db.payments[index].ledgerNumber = ledgerNumber;
    db.payments[index].updatedAt = now;

    await saveDb(db);
    return NextResponse.json({ success: true, payment: db.payments[index] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update payment" },
      { status: 500 }
    );
  }
}
