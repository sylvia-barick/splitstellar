"use client";

import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownLeft, ShieldCheck, ExternalLink, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TransactionsView() {
  const { address: userWallet } = useWallet();
  const { payments } = usePaymentStore();
  const { syncAllData } = useRealtimeSync();

  const activeAddr = (userWallet || "").toLowerCase();

  // Filter payments involving connected user
  const userTransactions = useMemo(() => {
    if (!userWallet) return payments;
    return payments.filter(
      (p) =>
        p.from.toLowerCase() === activeAddr ||
        p.to.toLowerCase() === activeAddr ||
        Boolean(p.transactionHash)
    );
  }, [payments, userWallet, activeAddr]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/25 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">On-Chain Stellar Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Real Stellar Testnet payments and settlement transactions submitted by members.
          </p>
        </div>
        <Button
          onClick={() => syncAllData()}
          variant="outline"
          className="border-border/60 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 self-start sm:self-auto h-9"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Sync</span>
        </Button>
      </div>

      {/* Ledger List */}
      <div className="space-y-3">
        {userTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/30 bg-card/15 p-12 text-center text-xs text-muted-foreground space-y-2">
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto opacity-60" />
            <p className="font-semibold text-foreground text-sm">No Stellar Transactions Recorded Yet</p>
            <p>Executed settlements on Stellar Testnet will appear here with real transaction hashes and explorer links.</p>
          </div>
        ) : (
          userTransactions.map((tx) => {
            const isSender = tx.from.toLowerCase() === activeAddr;
            const isReceiver = tx.to.toLowerCase() === activeAddr;
            const hasTxHash = Boolean(tx.transactionHash);

            const truncatedHash = hasTxHash
              ? `${tx.transactionHash!.slice(0, 8)}...${tx.transactionHash!.slice(-8)}`
              : `Internal-${tx.id.slice(-6)}`;

            return (
              <Card
                key={tx.id}
                className="border-border/30 bg-card/35 backdrop-blur-sm hover:border-primary/30 transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isSender
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isSender ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <Badge variant="outline" className="bg-secondary/60 text-foreground font-mono text-[9px] px-1.5 py-0 border-border">
                            {tx.ledgerNumber ? `Ledger #${tx.ledgerNumber}` : "Stellar Settlement"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(tx.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {hasTxHash ? (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1.5"
                          >
                            <span>Hash: {truncatedHash}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-xs font-mono font-bold text-foreground">Hash: {truncatedHash}</p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground font-mono">
                          <span>
                            From: {tx.from.slice(0, 8)}...{tx.from.slice(-6)}{" "}
                            {isSender && <strong className="text-amber-400 font-sans">(You)</strong>}
                          </span>
                          <span className="hidden sm:inline">→</span>
                          <span>
                            To: {tx.to.slice(0, 8)}...{tx.to.slice(-6)}{" "}
                            {isReceiver && <strong className="text-emerald-400 font-sans">(You)</strong>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-0 border-border/10 pt-3 md:pt-0 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Amount</p>
                        <p className="text-base font-black text-foreground">
                          {tx.amount.toFixed(2)} {tx.currency}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant="outline"
                          className={
                            tx.status === "Completed" || tx.status === "Confirmed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                              : tx.status === "Paid"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]"
                              : tx.status === "Failed"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                          }
                        >
                          {tx.status === "Completed" ? (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          ) : tx.status === "Failed" ? (
                            <XCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {tx.status}
                        </Badge>

                        {hasTxHash && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              window.open(
                                `https://stellar.expert/explorer/testnet/tx/${tx.transactionHash}`,
                                "_blank"
                              )
                            }
                            className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                            title="View on Stellar Expert Explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
