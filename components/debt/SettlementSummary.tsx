"use client";

import React from "react";
import { ArrowUpRight, ArrowDownLeft, Landmark, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SettlementSummaryProps {
  peopleOwing: number;
  peopleReceiving: number;
  totalDebt: number;
  transactionsSaved: number;
  currency: string;
}

export default function SettlementSummary({
  peopleOwing,
  peopleReceiving,
  totalDebt,
  transactionsSaved,
  currency,
}: SettlementSummaryProps) {
  const cards = [
    {
      title: "People Owing",
      value: `${peopleOwing}`,
      description: "Members with negative balances",
      icon: ArrowUpRight,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "People Receiving",
      value: `${peopleReceiving}`,
      description: "Members with positive balances",
      icon: ArrowDownLeft,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Total Debt",
      value: `${totalDebt.toFixed(2)} ${currency}`,
      description: "Net money moving between members",
      icon: Landmark,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Transactions Saved",
      value: `${transactionsSaved}`,
      description: "Payments eliminated by algorithm",
      icon: Zap,
      color: "text-primary bg-primary/10 border-primary/20",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-300">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="border-border/30 bg-card/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center space-x-3.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.color}`}>
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
