"use client";

import React from "react";
import { ArrowRight, Users, CheckCircle2 } from "lucide-react";
import { Debt } from "@/types/debt";
import { Member } from "@/types/member";

interface WhoOwesWhomPanelProps {
  debts: Debt[];
  members: Member[];
  currency: string;
}

export default function WhoOwesWhomPanel({ debts, members, currency }: WhoOwesWhomPanelProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return member ? member.name : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-5 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <span>Who Owes Whom (Net Debt Ledger)</span>
        </h3>
        <span className="text-[10px] text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full font-mono">
          Visible to all members
        </span>
      </div>

      {debts.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>No outstanding debts! Everyone in this group is fully settled up.</span>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {debts.map((debt) => {
            const debtorName = getMemberName(debt.from);
            const creditorName = getMemberName(debt.to);

            return (
              <div
                key={debt.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/25 text-xs"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-bold text-amber-400">{debtorName}</span>
                  <span className="text-muted-foreground text-[10px]">owes</span>
                  <span className="font-bold text-emerald-400">{creditorName}</span>
                </div>
                <div className="font-extrabold text-foreground shrink-0 flex items-center gap-1">
                  <span>
                    {debt.amount.toFixed(2)} {currency}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
