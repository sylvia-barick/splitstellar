"use client";

import React from "react";
import { TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BalanceCardProps {
  netBalance: number;
  currency: string;
}

export default function BalanceCard({ netBalance, currency }: BalanceCardProps) {
  const isOwed = netBalance > 0.01;
  const isOwing = netBalance < -0.01;

  return (
    <Card className="border-border/30 bg-gradient-to-r from-card/35 to-card/15 backdrop-blur-sm shadow-md">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Your Net Standing
          </span>
          <p className="text-xl font-black text-foreground">
            {isOwed ? "+" : ""}
            {netBalance.toFixed(2)} {currency}
          </p>
          <span className="block text-[10px] text-muted-foreground">
            {isOwed
              ? "You are owed funds by the group"
              : isOwing
              ? "You owe funds to other members"
              : "You are fully settled up!"}
          </span>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
            isOwed
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : isOwing
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-muted-foreground bg-secondary/20 border-border/40"
          }`}
        >
          {isOwed ? (
            <TrendingUp className="h-5 w-5" />
          ) : isOwing ? (
            <TrendingDown className="h-5 w-5" />
          ) : (
            <Landmark className="h-5 w-5" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
