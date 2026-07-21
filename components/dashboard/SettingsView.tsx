"use client";

import React from "react";
import { Shield, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsView() {
  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure blockchain providers, wallet integration, and notification preferences.
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Node Provider Settings */}
        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" /> Blockchain Node Provider
            </CardTitle>
            <CardDescription className="text-xs">
              Point SplitStellar to any custom Stellar RPC or Soroban node.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Active Network</label>
              <select className="rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:ring-primary focus-visible:outline-none">
                <option value="futurenet">Stellar Futurenet (Test Sandbox)</option>
                <option value="testnet">Stellar Testnet</option>
                <option value="mainnet">Stellar Mainnet</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Soroban Horizon URL</label>
              <Input
                defaultValue="https://horizon-futurenet.stellar.org"
                className="rounded-xl bg-background/20 border-border/40"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Soroban RPC Server URL</label>
              <Input
                defaultValue="https://soroban-testnet.stellar.org"
                className="rounded-xl bg-background/20 border-border/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Freighter Integration settings */}
        <Card className="border-border/40 bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-indigo-400" /> Wallet & Security
            </CardTitle>
            <CardDescription className="text-xs">
              Manage cryptographic settings for transaction signatures.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/10 pb-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Freighter API Auto-Signature</p>
                <p className="text-[11px] text-muted-foreground">
                  Skip manual popup signatures for small gas adjustments under 5 XLM.
                </p>
              </div>
              <input type="checkbox" className="accent-primary h-4 w-4" defaultChecked={false} />
            </div>

            <div className="flex items-center justify-between border-b border-border/10 pb-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Settle Notification Memos</p>
                <p className="text-[11px] text-muted-foreground">
                  Attach encrypted memo hashes to settlements so other party can verify off-chain details.
                </p>
              </div>
              <input type="checkbox" className="accent-primary h-4 w-4" defaultChecked={true} />
            </div>

            <Button className="bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(0,210,255,0.15)] mt-2">
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
