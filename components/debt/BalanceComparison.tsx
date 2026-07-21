"use client";

import React from "react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BalanceComparisonProps {
  originalTxCount: number;
  optimizedTxCount: number;
  reductionPercentage: number;
}

export default function BalanceComparison({
  originalTxCount,
  optimizedTxCount,
  reductionPercentage,
}: BalanceComparisonProps) {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-card/40 via-card/20 to-card/40 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="h-24 w-24 text-primary" />
      </div>

      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Debt Simplification Comparison</h3>
              <p className="text-[11px] text-muted-foreground">
                Greedy Minimum Cash Flow algorithm transaction reduction
              </p>
            </div>
          </div>

          <Badge className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 font-semibold rounded-xl">
            {reductionPercentage}% Reduction
          </Badge>
        </div>

        {/* Comparison Steps */}
        <div className="grid gap-4 sm:grid-cols-3 items-center border-t border-border/20 pt-4">
          <div className="rounded-xl border border-border/30 bg-secondary/10 p-3 text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Original Unsimplified
            </span>
            <span className="text-2xl font-black text-foreground block">{originalTxCount}</span>
            <span className="text-[10px] text-muted-foreground">Individual debt legs</span>
          </div>

          <div className="flex flex-col items-center justify-center text-primary">
            <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary mt-1">Algorithm Applied</span>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center space-y-1 shadow-[inset_0_0_12px_rgba(0,210,255,0.05)]">
            <span className="text-[10px] uppercase font-semibold text-primary tracking-wider block">
              Optimized Settlement
            </span>
            <span className="text-2xl font-black text-primary block">{optimizedTxCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Minimum required payments</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
