import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { MoneyRequest } from "@/types/payment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const address = searchParams.get("address");

  const db = await getDb();
  let requests = db.requests;

  if (groupId) {
    requests = requests.filter((r) => r.groupId === groupId);
  }

  if (address) {
    const lower = address.toLowerCase();
    requests = requests.filter(
      (r) => r.from.toLowerCase() === lower || r.to.toLowerCase() === lower
    );
  }

  return NextResponse.json({ success: true, requests });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, groupId, from, to, amount, currency, note, type, status, transactionHash, ledgerNumber, returnTxHash } = body;
    const db = await getDb();
    const now = new Date().toISOString();

    const newReq: MoneyRequest = {
      id: id || `${type === "DirectLoan" ? "loan" : "req"}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      from,
      to,
      amount,
      currency: currency || "XLM",
      note,
      type: type || "Request",
      status: status || (type === "DirectLoan" ? "Accepted" : "Pending"),
      createdAt: now,
      updatedAt: now,
      transactionHash,
      ledgerNumber,
      returnTxHash,
    };

    const existingIdx = db.requests.findIndex((r) => r.id === newReq.id);
    if (existingIdx >= 0) {
      db.requests[existingIdx] = newReq;
    } else {
      db.requests.push(newReq);
    }
    await saveDb(db);

    return NextResponse.json({ success: true, request: newReq });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create request" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, transactionHash, ledgerNumber, returnTxHash } = await request.json();
    const db = await getDb();
    const now = new Date().toISOString();

    const index = db.requests.findIndex((r) => r.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    db.requests[index].status = status;
    if (transactionHash) db.requests[index].transactionHash = transactionHash;
    if (ledgerNumber !== undefined) db.requests[index].ledgerNumber = ledgerNumber;
    if (returnTxHash) db.requests[index].returnTxHash = returnTxHash;
    db.requests[index].updatedAt = now;

    await saveDb(db);
    return NextResponse.json({ success: true, request: db.requests[index] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update request" },
      { status: 500 }
    );
  }
}
