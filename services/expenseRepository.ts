import { Expense } from "@/types/expense";
import {
  addExpenseOnChain,
  editExpenseOnChain,
  deleteExpenseOnChain,
  fetchGroupExpensesOnChain,
} from "@/lib/soroban/expense";

export const expenseRepository = {
  async fetchExpenses(groupId?: string): Promise<Expense[]> {
    if (groupId) {
      try {
        const chainExp = await fetchGroupExpensesOnChain(groupId);
        if (chainExp.length > 0) return chainExp;
      } catch (err) {
        console.warn("Soroban fetchGroupExpenses notice:", err);
      }
    }

    try {
      const params = new URLSearchParams();
      if (groupId) params.append("groupId", groupId);
      const url = `/api/expenses?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return data.success ? data.expenses : [];
    } catch {
      return [];
    }
  },

  async createExpense(expenseData: Omit<Expense, "id" | "createdAt" | "updatedAt">): Promise<Expense> {
    let expense: Expense;
    try {
      expense = await addExpenseOnChain(expenseData, expenseData.paidBy);
    } catch (err) {
      console.warn("Soroban addExpenseOnChain notice:", err);
      const now = new Date().toISOString();
      expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
    }

    try {
      await fetch(`/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
    } catch {
      // Local sync fallback
    }

    return expense;
  },

  async updateExpense(id: string, expenseData: Partial<Expense>): Promise<Expense> {
    try {
      await editExpenseOnChain(id, expenseData, expenseData.paidBy || "");
    } catch (err) {
      console.warn("Soroban editExpenseOnChain notice:", err);
    }

    const now = new Date().toISOString();
    const updated: Expense = {
      id,
      groupId: expenseData.groupId || "",
      title: expenseData.title || "",
      description: expenseData.description || "",
      amount: expenseData.amount || 0,
      currency: expenseData.currency || "XLM",
      paidBy: expenseData.paidBy || "",
      participants: expenseData.participants || [],
      splitType: expenseData.splitType || "Equal",
      category: expenseData.category || "Others",
      createdAt: now,
      updatedAt: now,
    };

    try {
      await fetch(`/api/expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, expenseData }),
      });
    } catch {
      // Fallback
    }

    return updated;
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await deleteExpenseOnChain(id, "");
    } catch (err) {
      console.warn("Soroban deleteExpenseOnChain notice:", err);
    }

    try {
      await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      // Fallback
    }
  },
};
