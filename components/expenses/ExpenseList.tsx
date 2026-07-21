"use client";

import React from "react";
import { Expense } from "@/types/expense";
import { Member } from "@/types/member";
import ExpenseCard from "./ExpenseCard";

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export default function ExpenseList({
  expenses,
  members,
  onEditExpense,
  onDeleteExpense,
}: ExpenseListProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          members={members}
          onEdit={() => onEditExpense(expense)}
          onDelete={() => onDeleteExpense(expense)}
        />
      ))}
    </div>
  );
}
