"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, ShieldCheck, DollarSign, TrendingUp, CheckCircle2, Clock, Users, Activity } from "lucide-react";
import { useGroupStore } from "@/stores/groupStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";

const categoryColors: Record<string, string> = {
  Food: "from-indigo-500 to-purple-500",
  Travel: "from-primary to-cyan-400",
  Housing: "from-amber-500 to-orange-500",
  Utilities: "from-emerald-500 to-teal-400",
  Entertainment: "from-rose-500 to-pink-500",
  General: "from-blue-500 to-indigo-400",
};

export default function AnalyticsView() {
  const groups = useGroupStore((state) => state.groups);
  const expenses = useExpenseStore((state) => state.expenses);
  const payments = usePaymentStore((state) => state.payments);
  const requests = useRequestStore((state) => state.requests);

  const groupShares = useMemo(() => {
    if (groups.length === 0) return [];

    return groups.map((g) => {
      const gExpenses = expenses.filter((e) => e.groupId === g.id);
      const spent = gExpenses.reduce((sum, e) => sum + e.amount, 0);

      const gPayments = payments.filter(
        (p) => p.groupId === g.id && (p.status === "Paid" || p.status === "Completed" || p.status === "Confirmed")
      );
      const settled = gPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        name: g.name,
        spent,
        settled: Math.min(settled, spent || settled),
        currency: g.currency || "XLM",
      };
    });
  }, [groups, expenses, payments]);

  const maxSpent = useMemo(
    () => Math.max(...groupShares.map((g) => g.spent), 1),
    [groupShares]
  );

  const categoryDistribution = useMemo(() => {
    if (expenses.length === 0) return [];

    const catMap: Record<string, number> = {};
    let totalSpent = 0;

    expenses.forEach((e) => {
      const cat = e.category || "General";
      catMap[cat] = (catMap[cat] || 0) + e.amount;
      totalSpent += e.amount;
    });

    return Object.entries(catMap).map(([category, spent]) => {
      const percentage = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
      return {
        category,
        spent,
        percentage,
        color: categoryColors[category] || "from-indigo-500 to-purple-500",
      };
    });
  }, [expenses]);

  const stats = useMemo(() => {
    const totalVolume = expenses.reduce((sum, e) => sum + e.amount, 0);
    const completedPayments = payments.filter(
      (p) => p.status === "Paid" || p.status === "Completed" || p.status === "Confirmed"
    );
    const settledVolume = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const settlementRatio = totalVolume > 0 ? Math.min(100, Math.round((settledVolume / totalVolume) * 100)) : 100;

    const avgExpense = expenses.length > 0 ? totalVolume / expenses.length : 0;
    const pendingRequests = requests.filter((r) => r.status === "Pending").length;

    // Top Spender
    const spenderMap: Record<string, number> = {};
    expenses.forEach((e) => {
      spenderMap[e.paidBy] = (spenderMap[e.paidBy] || 0) + e.amount;
    });
    const topSpenders = Object.entries(spenderMap)
      .map(([wallet, amount]) => ({ wallet, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalVolume,
      settledVolume,
      settlementRatio,
      avgExpense,
      pendingRequests,
      completedPaymentsCount: completedPayments.length,
      topSpenders,
    };
  }, [expenses, payments, requests]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/25 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Real-Time Blockchain Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Dynamic insight breakdown of group spends, category allocations, and on-chain settlement ratios.
          </p>
        </div>

        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-3 py-1 font-semibold rounded-xl self-start sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Soroban Indexed Data
        </Badge>
      </div>

      {/* Analytics KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Total Volume
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalVolume.toFixed(2)} XLM</div>
            <p className="text-[11px] text-muted-foreground mt-1">{expenses.length} expenses recorded</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Settlement Ratio
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.settlementRatio}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.settledVolume.toFixed(2)} XLM settled</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Completed Transfers
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.completedPaymentsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Confirmed on Stellar Testnet</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Avg. Expense
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats.avgExpense.toFixed(2)} XLM</div>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.pendingRequests} pending requests</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost comparison per group */}
        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Group Spends vs. On-Chain Settlements</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Comparison of total volume generated versus settled on Stellar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupShares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/30 p-8 text-center text-xs text-muted-foreground">
                No group expenses recorded yet. Create a group to see live spend breakdown!
              </div>
            ) : (
              groupShares.map((g) => {
                const spentPct = Math.round((g.spent / maxSpent) * 100);
                const settledPct = g.spent > 0 ? Math.round((g.settled / g.spent) * 100) : 100;

                return (
                  <div key={g.name} className="space-y-1.5 p-3 rounded-xl border border-border/30 bg-secondary/15">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{g.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {g.settled.toFixed(2)} / {g.spent.toFixed(2)} {g.currency} ({settledPct}% settled)
                      </span>
                    </div>

                    {/* Dual Bar Progress */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(spentPct, 5)}%` }}
                        ></div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary/30 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${(spentPct * settledPct) / 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Categories Analysis */}
        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-400" />
              <span>Category Spends Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Audit trails sorted by transaction category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {categoryDistribution.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/30 p-8 text-center text-xs text-muted-foreground">
                No categorized expenses available yet.
              </div>
            ) : (
              categoryDistribution.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{cat.spent.toFixed(1)} XLM</span>
                      <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-secondary/50 overflow-hidden p-0.5 border border-border/20">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-500`}
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

