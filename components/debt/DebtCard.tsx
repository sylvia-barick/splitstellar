"use client";

import React from "react";
import { ArrowRight, User } from "lucide-react";
import { Debt } from "@/types/debt";
import { Member } from "@/types/member";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DebtCardProps {
  debt: Debt;
  members: Member[];
}

export default function DebtCard({ debt, members }: DebtCardProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return member ? member.name : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  const debtorName = getMemberName(debt.from);
  const creditorName = getMemberName(debt.to);

  return (
    <Card className="border-border/30 bg-card/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        {/* From Debtor */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{debtorName}</p>
            <span className="text-[10px] text-amber-400 font-medium block">Pays</span>
          </div>
        </div>

        {/* Direction Arrow & Amount */}
        <div className="flex flex-col items-center shrink-0 space-y-1">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-secondary/30 border border-border/30">
            <span className="text-sm font-black text-foreground">
              {debt.amount.toFixed(2)} {debt.currency}
            </span>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <Badge
            variant="outline"
            className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0"
          >
            {debt.status}
          </Badge>
        </div>

        {/* To Creditor */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 justify-end text-right">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{creditorName}</p>
            <span className="text-[10px] text-emerald-400 font-medium block">Receives</span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <User className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
