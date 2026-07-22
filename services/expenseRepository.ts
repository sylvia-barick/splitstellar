import { Expense } from "@/types/expense";
import {
  addExpenseOnChain,
  editExpenseOnChain,
  deleteExpenseOnChain,
  fetchGroupExpensesOnChain,
} from "@/lib/soroban/expense";

// ─────────────────────────────────────────────────────────────────────────────
// expenseRepository — SINGLE SOURCE OF TRUTH: /api/expenses (→ lib/db.ts → Supabase)
// No direct Supabase table calls. No localStorage fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const expenseRepository = {
  async fetchExpenses(groupId?: string): Promise<Expense[]> {
    // 1. Try Soroban (best-effort)
    if (groupId) {
      try {
        const chainExp = await fetchGroupExpensesOnChain(groupId);
        if (chainExp.length > 0) return chainExp;
      } catch {
        // Expected
      }
    }

    // 2. REST API — authoritative source
    try {
      const url = groupId
        ? `/api/expenses?groupId=${encodeURIComponent(groupId)}`
        : `/api/expenses`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.expenses)) {
          return data.expenses as Expense[];
        }
      }
    } catch (err) {
      console.warn("[expenseRepo] API fetch error:", err);
    }

    return [];
  },

  async createExpense(
    expenseData: Omit<Expense, "id" | "createdAt" | "updatedAt">
  ): Promise<Expense> {
    // Try Soroban (best-effort)
    try {
      const chainExpense = await addExpenseOnChain(expenseData, expenseData.paidBy);
      // Even if Soroban succeeds, still persist via API for consistency
      await fetch(`/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chainExpense),
      });
      return chainExpense;
    } catch {
      // Expected — fall through to API-only path
    }

    const res = await fetch(`/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    });
    const data = await res.json();
    if (!data.success || !data.expense) {
      throw new Error(data.error || "Failed to create expense");
    }
    return data.expense as Expense;
  },

  async updateExpense(id: string, expenseData: Partial<Expense>): Promise<Expense> {
    try {
      await editExpenseOnChain(id, expenseData, expenseData.paidBy || "");
    } catch {
      // Expected
    }

    const res = await fetch(`/api/expenses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, expenseData }),
    });
    const data = await res.json();
    if (!data.success || !data.expense) {
      throw new Error(data.error || "Failed to update expense");
    }
    return data.expense as Expense;
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await deleteExpenseOnChain(id, "");
    } catch {
      // Expected
    }

    const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete expense");
    }
  },
};
