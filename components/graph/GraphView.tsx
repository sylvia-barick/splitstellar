"use client";

import React, { useMemo } from "react";
import { ReactFlow, MiniMap, Controls, Background, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Info, Zap, ShieldCheck, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/hooks/useGroups";
import { useExpenseStore } from "@/stores/expenseStore";

export default function GraphView() {
  const { address: userWallet } = useWallet();
  const { groups } = useGroups();
  const calculateBalances = useExpenseStore((state) => state.calculateBalances);
  const expenses = useExpenseStore((state) => state.expenses);

  const activeAddr = (userWallet || "").toLowerCase();

  // 1. Gather all unique group members across joined user groups
  const { nodes, edges, debtSummaries } = useMemo(() => {
    const memberMap = new Map<string, { walletAddress: string; name: string }>();
    const memberAddrs = new Set<string>();

    groups.forEach((g) => {
      g.members.forEach((m) => {
        const lower = m.walletAddress.toLowerCase();
        if (!memberMap.has(lower)) {
          memberMap.set(lower, { walletAddress: m.walletAddress, name: m.name });
          memberAddrs.add(m.walletAddress);
        }
      });
    });

    if (activeAddr && !memberMap.has(activeAddr)) {
      memberMap.set(activeAddr, { walletAddress: userWallet || activeAddr, name: "You" });
      memberAddrs.add(userWallet || activeAddr);
    }

    const membersList = Array.from(memberMap.values());
    if (membersList.length === 0) {
      return { nodes: [], edges: [], debtSummaries: [] };
    }

    // 2. Compute net balances across all user groups
    const netBalanceMap: Record<string, number> = {};
    groups.forEach((g) => {
      const gMemberAddrs = g.members.map((m) => m.walletAddress);
      const bMap = calculateBalances(g.id, gMemberAddrs);
      Object.entries(bMap).forEach(([addr, bal]) => {
        netBalanceMap[addr] = (netBalanceMap[addr] || 0) + bal.netBalance;
      });
    });

    // 3. Generate Nodes dynamically
    const generatedNodes: Node[] = membersList.map((m, idx) => {
      const isUser = m.walletAddress.toLowerCase() === activeAddr;
      const netBal = netBalanceMap[m.walletAddress.toLowerCase()] || 0;
      const radius = 180;
      const angle = (idx / Math.max(membersList.length, 1)) * 2 * Math.PI;

      const x = isUser ? 250 : 250 + Math.cos(angle) * radius;
      const y = isUser ? 200 : 200 + Math.sin(angle) * radius;

      const label = isUser
        ? `🔑 You (${m.walletAddress.slice(0, 6)}...)`
        : `${m.name} (${m.walletAddress.slice(0, 6)}...)`;

      return {
        id: m.walletAddress.toLowerCase(),
        type: "default",
        data: {
          label: `${label}\nNet: ${netBal >= 0 ? "+" : ""}${netBal.toFixed(2)} XLM`,
        },
        position: { x, y },
        style: {
          background: isUser ? "#1e1b4b" : "#0b0c16",
          color: isUser ? "#00d2ff" : netBal > 0 ? "#34d399" : netBal < 0 ? "#fbbf24" : "#f8fafc",
          border: isUser ? "2px solid #00d2ff" : "1px solid #1a1d30",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: isUser ? "bold" : "normal",
          padding: "8px 12px",
          boxShadow: isUser ? "0 0 15px rgba(0, 210, 255, 0.25)" : "none",
          whiteSpace: "pre-wrap",
          textAlign: "center",
        },
      };
    });

    // 4. Generate Edges dynamically from debtors to creditors
    const debtors: { addr: string; amount: number }[] = [];
    const creditors: { addr: string; amount: number }[] = [];

    Object.entries(netBalanceMap).forEach(([addr, net]) => {
      if (net < -0.01) debtors.push({ addr, amount: Math.abs(net) });
      else if (net > 0.01) creditors.push({ addr, amount: net });
    });

    const generatedEdges: Edge[] = [];
    const summaries: { fromName: string; toName: string; amount: number; isUserDebtor: boolean; isUserCreditor: boolean }[] = [];

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const d = debtors[dIdx];
      const c = creditors[cIdx];
      const transferAmount = Math.min(d.amount, c.amount);

      if (transferAmount > 0.01) {
        const fromInfo = memberMap.get(d.addr);
        const toInfo = memberMap.get(c.addr);

        const fromName = d.addr === activeAddr ? "You" : fromInfo?.name || `${d.addr.slice(0, 6)}...`;
        const toName = c.addr === activeAddr ? "You" : toInfo?.name || `${c.addr.slice(0, 6)}...`;

        const isUserDebtor = d.addr === activeAddr;
        const isUserCreditor = c.addr === activeAddr;

        generatedEdges.push({
          id: `e-${d.addr}-${c.addr}`,
          source: d.addr,
          target: c.addr,
          label: `owes ${transferAmount.toFixed(2)} XLM`,
          animated: isUserDebtor || isUserCreditor,
          style: {
            stroke: isUserDebtor ? "#fbbf24" : isUserCreditor ? "#34d399" : "#8b5cf6",
            strokeWidth: isUserDebtor || isUserCreditor ? 2 : 1.5,
          },
          labelStyle: {
            fill: isUserDebtor ? "#fbbf24" : isUserCreditor ? "#34d399" : "#8b5cf6",
            fontWeight: "bold",
            fontSize: 10,
          },
          labelBgStyle: { fill: "#0b0c16" },
        });

        summaries.push({
          fromName,
          toName,
          amount: transferAmount,
          isUserDebtor,
          isUserCreditor,
        });
      }

      d.amount -= transferAmount;
      c.amount -= transferAmount;

      if (d.amount <= 0.01) dIdx++;
      if (c.amount <= 0.01) cIdx++;
    }

    return { nodes: generatedNodes, edges: generatedEdges, debtSummaries: summaries };
  }, [groups, calculateBalances, activeAddr, userWallet]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/25 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Real-Time Blockchain Debt Graph</h1>
          <p className="text-sm text-muted-foreground">
            Dynamically computed net debt relationships from on-chain group expenses and settlements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border/60 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1 h-9">
            <Info className="h-4 w-4" />
            <span>How it works</span>
          </Button>
          <Button className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(0,210,255,0.15)] flex items-center space-x-2 h-9 text-xs">
            <Zap className="h-4 w-4" />
            <span>Simplification Active</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* React Flow Board */}
        <Card className="lg:col-span-3 border-border/40 bg-card/25 backdrop-blur-sm overflow-hidden h-[520px] relative">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-card/10">
              <Layers className="h-10 w-10 text-primary mb-3 opacity-60" />
              <h3 className="text-base font-bold text-foreground mb-1">No Active Group Members Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Create a group and add expenses to see live blockchain debt nodes and edges rendered dynamically.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              style={{ width: "100%", height: "100%" }}
              minZoom={0.5}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Controls showInteractive={false} className="bg-card text-foreground border-border" />
              <MiniMap
                style={{ background: "#0b0c16", border: "1px solid #1a1d30", borderRadius: "8px" }}
                nodeColor="#1a1d30"
                maskColor="rgba(0,0,0,0.5)"
              />
              <Background color="#1e293b" gap={16} size={1} />
            </ReactFlow>
          )}
        </Card>

        {/* Graph Details Sidebar */}
        <div className="space-y-4">
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Optimized Debt Transfers</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Consolidated debt flows across joined groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {debtSummaries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/30 p-4 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                  All accounts are fully settled up!
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {debtSummaries.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-secondary/15"
                    >
                      <span className="text-muted-foreground font-medium">
                        {s.fromName} → {s.toName}:
                      </span>
                      <span
                        className={`font-bold font-mono ${
                          s.isUserDebtor
                            ? "text-amber-400"
                            : s.isUserCreditor
                            ? "text-emerald-400"
                            : "text-primary"
                        }`}
                      >
                        {s.amount.toFixed(2)} XLM
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Soroban Network State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-mono text-emerald-400 text-[10px] font-bold">Stellar Testnet</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expenses Ingested</span>
                <span className="font-mono text-foreground font-bold">{expenses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Nodes</span>
                <span className="font-mono text-primary font-bold">{nodes.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

