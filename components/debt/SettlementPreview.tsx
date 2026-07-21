"use client";

import React from "react";
import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { Debt } from "@/types/debt";
import { Member } from "@/types/member";

interface SettlementPreviewProps {
  balances: Record<string, { totalPaid: number; totalOwes: number; netBalance: number }>;
  debts: Debt[];
  members: Member[];
  currency: string;
}

export default function SettlementPreview({
  balances,
  debts,
  members,
  currency,
}: SettlementPreviewProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return member ? member.name : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-6 space-y-6 animate-in fade-in duration-300">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
        Settlement Plan Preview
      </h3>

      {/* Step 1: Original Standings */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-foreground font-mono">
            1
          </span>
          Original Member Net Balances
        </span>

        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          {members.map((member) => {
            const bal = balances[member.walletAddress.toLowerCase()]?.netBalance || 0;
            const isCreditor = bal > 0.01;
            const isDebtor = bal < -0.01;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/25 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{member.name}</p>
                  <span
                    className={
                      isCreditor
                        ? "text-emerald-400 text-[10px] font-medium"
                        : isDebtor
                        ? "text-amber-400 text-[10px] font-medium"
                        : "text-muted-foreground text-[10px]"
                    }
                  >
                    {isCreditor ? "receives" : isDebtor ? "pays" : "settled"}
                  </span>
                </div>
                <div
                  className={
                    isCreditor
                      ? "text-emerald-400 font-extrabold text-xs"
                      : isDebtor
                      ? "text-amber-400 font-extrabold text-xs"
                      : "text-muted-foreground font-semibold text-xs"
                  }
                >
                  {isCreditor ? "+" : ""}
                  {bal.toFixed(2)} {currency}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow Indicator */}
      <div className="flex justify-center py-1 text-primary">
        <div className="flex flex-col items-center gap-1">
          <div className="h-6 w-0.5 bg-gradient-to-b from-primary/60 to-primary"></div>
          <ArrowDown className="h-5 w-5 text-primary animate-bounce" />
        </div>
      </div>

      {/* Step 2: Simplified Transactions */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary font-mono">
            2
          </span>
          Optimized Direct Transfers
        </span>

        {debts.length === 0 ? (
          <div className="p-4 rounded-xl border border-border/20 bg-secondary/10 text-center text-xs text-muted-foreground">
            No transfers required. All members are balanced!
          </div>
        ) : (
          <div className="space-y-2.5">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs shadow-[inset_0_0_10px_rgba(0,210,255,0.03)]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="font-bold text-foreground">{getMemberName(debt.from)}</span>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-bold text-foreground">{getMemberName(debt.to)}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-sm font-black text-foreground">
                    {debt.amount.toFixed(2)} {debt.currency}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
