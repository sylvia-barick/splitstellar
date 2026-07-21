"use client";

import React from "react";
import { Clock, Calendar } from "lucide-react";
import { Expense } from "@/types/expense";
import { Member } from "@/types/member";

interface ExpenseHistoryProps {
  expenses: Expense[];
  members: Member[];
}

export default function ExpenseHistory({ expenses, members }: ExpenseHistoryProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    return member ? member.name : `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sort expenses newest first
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sortedExpenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground bg-card/10">
        No expense activities recorded.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
        <Clock className="h-4 w-4 text-indigo-400" /> Recent Expense Log
      </h3>
      <div className="relative border-l border-border/40 ml-2.5 pl-4.5 space-y-5 py-2 text-xs">
        {sortedExpenses.slice(0, 5).map((exp) => (
          <div key={exp.id} className="relative">
            <span className="absolute -left-[23.5px] top-1 flex h-2 w-2 rounded-full bg-primary ring-4 ring-card"></span>
            <div className="space-y-0.5">
              <p className="text-foreground leading-normal">
                <strong>{getMemberName(exp.paidBy)}</strong> added expense &ldquo;{exp.title}&rdquo; for{" "}
                <strong>
                  {exp.amount.toFixed(2)} {exp.currency}
                </strong>
                .
              </p>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" /> {formatDate(exp.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
