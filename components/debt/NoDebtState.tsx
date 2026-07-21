"use client";

import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function NoDebtState() {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-10 text-center space-y-3 animate-in fade-in duration-300">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
          <span>No debts found!</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Everyone is completely settled up. All balances in this group equal 0.00.
        </p>
      </div>
    </div>
  );
}
