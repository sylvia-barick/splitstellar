"use client";

import React, { useEffect, useState } from "react";
import { Server, Database, Cpu, Activity, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardView() {
  const [health, setHealth] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [contractsStatus, setContractsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSystemMetrics = async () => {
    setLoading(true);
    try {
      const [hRes, sRes, dbRes, cRes] = await Promise.all([
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/status").then((r) => r.json()),
        fetch("/api/database/status").then((r) => r.json()),
        fetch("/api/contracts/status").then((r) => r.json()),
      ]);

      setHealth(hRes);
      setStatus(sRes);
      setDbStatus(dbRes);
      setContractsStatus(cRes);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/25 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Enterprise Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live system monitoring, Soroban contract statuses, RPC health, and database metrics.
          </p>
        </div>

        <Button
          onClick={fetchSystemMetrics}
          disabled={loading}
          variant="outline"
          className="border-border/60 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 self-start sm:self-auto h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh System Health</span>
        </Button>
      </div>

      {/* KPI Status Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              API Server
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Server className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{health?.status || "Healthy"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">Uptime: {Math.round(health?.uptimeSeconds || 0)}s</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Soroban RPC
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>{contractsStatus?.contracts?.status || "Online"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate">{contractsStatus?.contracts?.network || "Stellar Testnet"}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Database Store
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Database className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {dbStatus?.database?.recordCounts?.groups || 0} Groups
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{dbStatus?.database?.recordCounts?.expenses || 0} expenses recorded</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Event Indexer
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-400">Active</div>
            <p className="text-[11px] text-muted-foreground mt-1">{status?.metrics?.payments || 0} settlements indexed</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract & Database Health Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Deployed Soroban Smart Contracts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              On-chain contract deployment addresses on Stellar Testnet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs font-mono">
            {contractsStatus?.contracts?.addresses &&
              Object.entries(contractsStatus.contracts.addresses).map(([name, addr]) => (
                <div key={name} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-secondary/15">
                  <span className="font-bold text-foreground capitalize">{name.toLowerCase()} Contract</span>
                  <span className="text-primary text-[10px]">{String(addr).slice(0, 8)}...{String(addr).slice(-6)}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              <span>Database Collection Counts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Record metrics indexed in persistent database store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {dbStatus?.database?.recordCounts &&
              Object.entries(dbStatus.database.recordCounts).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-secondary/15">
                  <span className="font-semibold text-foreground capitalize">{key}</span>
                  <Badge variant="outline" className="font-mono text-xs text-primary">{String(count)}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
