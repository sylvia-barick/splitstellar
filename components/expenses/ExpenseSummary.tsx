"use client";

import React from "react";
import { Landmark, Users, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Expense } from "@/types/expense";

interface ExpenseSummaryProps {
  summary: {
    totalExpenses: number;
    totalMembers: number;
    averageExpense: number;
    highestExpense: number;
    lowestExpense: number;
    recentExpense: Expense | null;
  };
  currency: string;
}

export default function ExpenseSummary({ summary, currency }: ExpenseSummaryProps) {
  const cards = [
    {
      title: "Total Expenses",
      value: `${summary.totalExpenses.toFixed(2)} ${currency}`,
      description: "Aggregated spent balance",
      icon: Landmark,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Group Members",
      value: `${summary.totalMembers}`,
      description: "Active members in split contract",
      icon: Users,
      iconColor: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: "Average Expense",
      value: `${summary.averageExpense.toFixed(2)} ${currency}`,
      description: "Mean value per transaction",
      icon: Activity,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Highest Spent",
      value: `${summary.highestExpense.toFixed(2)} ${currency}`,
      description: "Maximum single bill logged",
      icon: TrendingUp,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Lowest Spent",
      value: `${summary.lowestExpense.toFixed(2)} ${currency}`,
      description: "Minimum single bill logged",
      icon: TrendingDown,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Recent Transaction",
      value: summary.recentExpense ? summary.recentExpense.title : "None",
      description: summary.recentExpense
        ? `${summary.recentExpense.amount.toFixed(0)} ${currency} (${new Date(
            summary.recentExpense.createdAt
          ).toLocaleDateString()})`
        : "No transactions logged yet",
      icon: Clock,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="border-border/30 bg-card/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center space-x-3.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.iconColor}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {c.title}
                </span>
                <p className="text-sm font-black text-foreground truncate">{c.value}</p>
                <span className="block text-[10px] text-muted-foreground/80 truncate">
                  {c.description}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
