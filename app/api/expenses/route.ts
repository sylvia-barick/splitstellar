import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { Expense } from "@/types/expense";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const address = searchParams.get("address");

  const db = getDb();
  let expenses = db.expenses;

  if (groupId) {
    expenses = expenses.filter((e) => e.groupId === groupId);
  }

  if (address) {
    const lower = address.toLowerCase();
    expenses = expenses.filter(
      (e) =>
        e.paidBy.toLowerCase() === lower ||
        e.participants.some((p) => p.walletAddress.toLowerCase() === lower)
    );
  }

  return NextResponse.json({ success: true, expenses });
}

export async function POST(request: NextRequest) {
  try {
    const expenseData = await request.json();
    const db = getDb();
    const now = new Date().toISOString();

    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    db.expenses.push(newExpense);
    saveDb(db);

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create expense" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, expenseData } = await request.json();
    const db = getDb();
    const now = new Date().toISOString();

    const index = db.expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    db.expenses[index] = {
      ...db.expenses[index],
      ...expenseData,
      updatedAt: now,
    };

    saveDb(db);
    return NextResponse.json({ success: true, expense: db.expenses[index] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing expense ID" }, { status: 400 });
    }

    const db = getDb();
    db.expenses = db.expenses.filter((e) => e.id !== id);
    saveDb(db);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete expense" },
      { status: 500 }
    );
  }
}
