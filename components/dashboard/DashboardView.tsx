"use client";

import React, { useMemo, useState } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  DollarSign,
  Clock,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/hooks/useGroups";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";
import { settlementAdapter } from "@/services/settlementAdapter";
import { MoneyRequest } from "@/types/payment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function DashboardView() {
  const { address: userWallet } = useWallet();
  const { groups } = useGroups();
  const expenses = useExpenseStore((state) => state.expenses);
  const calculateBalances = useExpenseStore((state) => state.calculateBalances);

  const payments = usePaymentStore((state) => state.payments);
  const { markAsPaid, confirmReceipt, createPayment } = usePaymentStore();

  const requests = useRequestStore((state) => state.requests);
  const { respondToRequest, markRequestAsPaidWithTx } = useRequestStore();

  const activities = useActivityStore((state) => state.activities);
  const addActivity = useActivityStore((state) => state.addActivity);

  const activeAddr = (userWallet || "").toLowerCase();

  // Joined groups
  const userGroups = useMemo(() => {
    if (!userWallet) return [];
    return groups.filter(
      (g) =>
        g.ownerWallet.toLowerCase() === activeAddr ||
        g.members.some((m) => m.walletAddress.toLowerCase() === activeAddr)
    );
  }, [groups, userWallet, activeAddr]);

  // Aggregate user balances across all joined groups
  const userBalances = useMemo(() => {
    let totalPaid = 0;
    let totalOwes = 0;

    userGroups.forEach((g) => {
      const memberAddrs = g.members.map((m) => m.walletAddress);
      const bMap = calculateBalances(g.id, memberAddrs);
      if (bMap[activeAddr]) {
        totalPaid += bMap[activeAddr].totalPaid;
        totalOwes += bMap[activeAddr].totalOwes;
      }
    });

    const net = totalPaid - totalOwes;
    return {
      totalPaid,
      totalOwes,
      net,
      moneyOwed: net < 0 ? Math.abs(net) : 0,
      moneyReceivable: net > 0 ? net : 0,
    };
  }, [userGroups, calculateBalances, activeAddr]);

  // Pending payments where user is debtor or creditor
  const pendingPayments = useMemo(() => {
    return payments.filter(
      (p) =>
        (p.from.toLowerCase() === activeAddr || p.to.toLowerCase() === activeAddr) &&
        p.status === "Pending"
    );
  }, [payments, activeAddr]);

  // Pending or active returnable requests where user is requester or target
  const pendingRequests = useMemo(() => {
    return requests.filter((r) => {
      const isUser = r.from.toLowerCase() === activeAddr || r.to.toLowerCase() === activeAddr;
      if (!isUser) return false;
      return r.status === "Pending" || (r.status === "Paid" && r.from.toLowerCase() === activeAddr);
    });
  }, [requests, activeAddr]);

  // Completed payments count
  const completedPaymentsCount = useMemo(() => {
    return payments.filter(
      (p) =>
        (p.from.toLowerCase() === activeAddr || p.to.toLowerCase() === activeAddr) &&
        (p.status === "Paid" || p.status === "Completed")
    ).length;
  }, [payments, activeAddr]);

  const [isPayingId, setIsPayingId] = useState<string | null>(null);

  const handlePayNow = async (paymentId: string, fromAddr: string, toAddr: string, amount: number, currency: string, groupId: string) => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the Stellar transaction.",
      });
      return;
    }

    if (userWallet.toLowerCase() !== fromAddr.toLowerCase()) {
      toast.error("Permission Denied", {
        description: "Only the debtor can execute this payment transaction.",
      });
      return;
    }

    setIsPayingId(paymentId);
    toast.info("Opening Freighter Wallet...", {
      description: `Sign ${amount.toFixed(2)} ${currency} payment operation on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: fromAddr,
        receiverWallet: toAddr,
        amount,
        currency,
        groupId,
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar transaction signature rejected or submission failed.");
      }

      await markAsPaid(paymentId, result.hash, result.ledger);

      const actorLabel = `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`;
      await addActivity(
        groupId || "global",
        userWallet,
        actorLabel,
        "PaymentPaid",
        `${actorLabel} paid ${toAddr.slice(0, 6)}... ${amount.toFixed(2)} ${currency} on Stellar Testnet (Tx: ${result.hash.slice(0, 8)}...)`,
        amount,
        currency
      );

      // Force recalculation of balances across user groups
      userGroups.forEach((g) => {
        useExpenseStore.getState().calculateBalances(g.id);
      });

      toast.success("Payment Confirmed on Stellar Testnet!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stellar Testnet payment failed. Balances remain unchanged.";
      toast.error("Payment Execution Failed", {
        description: msg,
      });
    } finally {
      setIsPayingId(null);
    }
  };

  const [isProcessingRequestId, setIsProcessingRequestId] = useState<string | null>(null);

  const handleAcceptAndPayRequest = async (r: MoneyRequest) => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the payment transaction.",
      });
      return;
    }

    if (userWallet.toLowerCase() !== r.to.toLowerCase()) {
      toast.error("Permission Denied", {
        description: "Only the designated payer can accept & pay this request.",
      });
      return;
    }

    setIsProcessingRequestId(r.id);
    toast.info("Opening Freighter Wallet...", {
      description: `Please sign the ${r.amount.toFixed(2)} ${r.currency} payment transaction on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: userWallet,
        receiverWallet: r.from,
        amount: r.amount,
        currency: r.currency,
        groupId: r.groupId,
        note: r.note || "Money Request Payment",
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar transaction signature was rejected or submission failed.");
      }

      // 1. Update Money Request status to Paid with tx hash and ledger
      await markRequestAsPaidWithTx(r.id, result.hash, result.ledger);

      // 2. Create Payment record for transactions list & balances
      const newPayment = await createPayment(
        r.groupId,
        r.to,
        r.from,
        r.amount,
        r.currency,
        r.note || "Money Request Payment",
        result.hash,
        result.ledger,
        undefined,
        r.id
      );
      await confirmReceipt(newPayment.id, result.hash, result.ledger);

      // 3. Add activity log
      const actorLabel = `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`;
      await addActivity(
        r.groupId || "global",
        userWallet,
        actorLabel,
        "PaymentConfirmed",
        `${actorLabel} paid ${r.from.slice(0, 6)}... ${r.amount.toFixed(2)} ${r.currency} for Money Request on Stellar Testnet (Tx Hash: ${result.hash.slice(0, 8)}...)`,
        r.amount,
        r.currency
      );

      // 4. Force balance recalculation
      userGroups.forEach((g) => {
        useExpenseStore.getState().calculateBalances(g.id);
      });

      toast.success("Money Request Paid on Stellar Testnet!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stellar transaction failed. Request remains Pending and balances are unchanged.";
      toast.error("Payment Execution Failed", {
        description: msg,
      });
    } finally {
      setIsProcessingRequestId(null);
    }
  };

  const handleReturnMoney = async (r: MoneyRequest) => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the return payment transaction.",
      });
      return;
    }

    if (userWallet.toLowerCase() !== r.from.toLowerCase()) {
      toast.error("Permission Denied", {
        description: "Only the requester who received funds can return the money.",
      });
      return;
    }

    setIsProcessingRequestId(r.id);
    toast.info("Opening Freighter Wallet...", {
      description: `Please sign the ${r.amount.toFixed(2)} ${r.currency} payment transaction to return money back on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: userWallet,
        receiverWallet: r.to,
        amount: r.amount,
        currency: r.currency,
        groupId: r.groupId,
        note: r.note ? `Returned: ${r.note}` : "Returned Money Request",
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar transaction signature was rejected or submission failed.");
      }

      // 1. Mark request as Completed with returnTxHash
      const { returnRequestedMoney } = useRequestStore.getState();
      await returnRequestedMoney(r.id, result.hash, result.ledger);

      // 2. Create Payment record for transactions list & balances
      const newPayment = await createPayment(
        r.groupId,
        r.from,
        r.to,
        r.amount,
        r.currency,
        r.note ? `Returned: ${r.note}` : "Returned Money Request",
        result.hash,
        result.ledger,
        undefined,
        r.id
      );
      await confirmReceipt(newPayment.id, result.hash, result.ledger);

      // 3. Add activity log
      const actorLabel = `${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`;
      await addActivity(
        r.groupId || "global",
        userWallet,
        actorLabel,
        "PaymentConfirmed",
        `${actorLabel} returned ${r.amount.toFixed(2)} ${r.currency} back on Stellar Testnet (Tx Hash: ${result.hash.slice(0, 8)}...)`,
        r.amount,
        r.currency
      );

      // 4. Force balance recalculation
      userGroups.forEach((g) => {
        useExpenseStore.getState().calculateBalances(g.id);
      });

      toast.success("Money Returned on Stellar Testnet!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stellar transaction failed. Return money execution cancelled.";
      toast.error("Return Execution Failed", {
        description: msg,
      });
    } finally {
      setIsProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await respondToRequest(id, false);
      toast.info("Request Rejected", {
        description: "Request status updated to Rejected. No blockchain transaction was executed.",
      });
    } catch (err) {
      toast.error("Failed to reject request");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Member Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-background p-6 md:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-60 w-60 rounded-full bg-primary/10 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Personal Financial Ledger
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Connected Wallet Address:{" "}
              <span className="font-mono text-primary font-bold">
                {userWallet ? `${userWallet.slice(0, 12)}...${userWallet.slice(-8)}` : "Freighter Wallet Disconnected"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Personal Ledger Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Money You Owe */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Money You Owe
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {userBalances.moneyOwed.toFixed(2)} XLM
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total pending debt across groups</p>
          </CardContent>
        </Card>

        {/* Money You'll Receive */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              You&apos;ll Receive
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {userBalances.moneyReceivable.toFixed(2)} XLM
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total receivable credits across groups</p>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Net Balance
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                userBalances.net > 0.01
                  ? "text-emerald-400"
                  : userBalances.net < -0.01
                  ? "text-amber-400"
                  : "text-foreground"
              }`}
            >
              {userBalances.net > 0 ? "+" : ""}
              {userBalances.net.toFixed(2)} XLM
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {userBalances.net > 0
                ? "Overall net creditor"
                : userBalances.net < 0
                ? "Overall net debtor"
                : "Fully settled up!"}
            </p>
          </CardContent>
        </Card>

        {/* Joined Groups */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Groups Joined
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userGroups.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active shared expense ledgers</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Pending Payments & Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Payments & Requests Section */}
        <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Pending Settlements & Money Requests</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Actions requiring your payment or confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPayments.length === 0 && pendingRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/30 p-8 text-center text-xs text-muted-foreground bg-card/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                No pending payments or requests for your account. You&apos;re up to date!
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Payments */}
                {pendingPayments.map((p) => {
                  const isDebtor = p.from.toLowerCase() === activeAddr;
                  const isCreditor = p.to.toLowerCase() === activeAddr;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/30 bg-secondary/15 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={
                              isDebtor
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]"
                            }
                          >
                            {isDebtor ? "Pay Required" : "Receivable"}
                          </Badge>
                          <span className="font-bold text-foreground">
                            {isDebtor ? `Pay to ${p.to.slice(0, 8)}...` : `Receive from ${p.from.slice(0, 8)}...`}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.note || "Settlement transfer"}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-foreground">
                          {p.amount.toFixed(2)} {p.currency}
                        </span>

                        {isDebtor && p.status === "Pending" ? (
                          <Button
                            onClick={() => handlePayNow(p.id, p.from, p.to, p.amount, p.currency, p.groupId)}
                            disabled={isPayingId === p.id}
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-xl h-7 px-3 font-semibold flex items-center gap-1.5"
                          >
                            {isPayingId === p.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Signing...</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-3 w-3" />
                                <span>Pay with Freighter</span>
                              </>
                            )}
                          </Button>
                        ) : isDebtor && (p.status === "Paid" || p.status === "Completed") ? (
                          <Button
                            onClick={() =>
                              p.transactionHash
                                ? window.open(`https://stellar.expert/explorer/testnet/tx/${p.transactionHash}`, "_blank")
                                : undefined
                            }
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs rounded-xl h-7 px-2.5 font-semibold flex items-center gap-1"
                          >
                            <span>View Transaction</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        ) : isCreditor && p.status === "Pending" ? (
                          <span className="text-[11px] text-muted-foreground italic font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-400 animate-pulse" />
                            Waiting for Payment
                          </span>
                        ) : isCreditor && (p.status === "Paid" || p.status === "Completed") ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> Payment Received
                            </span>
                            {p.transactionHash && (
                              <Button
                                onClick={() =>
                                  window.open(`https://stellar.expert/explorer/testnet/tx/${p.transactionHash}`, "_blank")
                                }
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg h-6 px-2"
                              >
                                View Transaction
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Money Requests */}
                {pendingRequests.map((r) => {
                  const isTarget = r.to.toLowerCase() === activeAddr;
                  const isPaid = r.status === "Paid" || r.status === "Completed";
                  const txHash = r.transactionHash;

                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px]">
                            {r.type === "DirectLoan" ? "Direct Loan" : "Request"}
                          </Badge>
                          <span className="font-bold text-foreground">
                            {isTarget ? `Request from: ${r.from.slice(0, 8)}...` : `Sent to ${r.to.slice(0, 8)}...`}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{r.note || "Money request"}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-foreground">
                          {r.amount.toFixed(2)} {r.currency}
                        </span>

                        {isTarget && r.status === "Pending" ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleAcceptAndPayRequest(r)}
                              disabled={isProcessingRequestId === r.id}
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              {isProcessingRequestId === r.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Signing...</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-3 w-3" />
                                  <span>Accept & Pay</span>
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleRejectRequest(r.id)}
                              disabled={isProcessingRequestId === r.id}
                              size="sm"
                              variant="ghost"
                              className="text-rose-400 hover:bg-rose-500/10 text-[10px] rounded-lg h-7 px-2 font-semibold"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : r.status === "Paid" && r.from.toLowerCase() === activeAddr ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleReturnMoney(r)}
                              disabled={isProcessingRequestId === r.id}
                              size="sm"
                              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              {isProcessingRequestId === r.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Signing...</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-3 w-3" />
                                  <span>Return Money</span>
                                </>
                              )}
                            </Button>
                            {txHash && (
                              <Button
                                onClick={() =>
                                  window.open(`https://stellar.expert/explorer/testnet/tx/${txHash}`, "_blank")
                                }
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg h-6 px-2 font-semibold flex items-center gap-1"
                              >
                                <span>Paid Tx</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : isPaid ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={
                                r.status === "Completed"
                                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-[10px]"
                                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                              }
                            >
                              {r.status === "Completed" ? "Returned" : "Paid"}
                            </Badge>
                            {(r.returnTxHash || txHash) && (
                              <Button
                                onClick={() =>
                                  window.open(
                                    `https://stellar.expert/explorer/testnet/tx/${r.returnTxHash || txHash}`,
                                    "_blank"
                                  )
                                }
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/30 text-emerald-400 text-[10px] rounded-lg h-6 px-2 font-semibold flex items-center gap-1"
                              >
                                <span>View Tx</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Activity Feed */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Live Member Activity Feed</CardTitle>
            <CardDescription className="text-xs">Actions recorded across your groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No activity recorded yet.
                </div>
              ) : (
                activities.slice(0, 10).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between rounded-xl border border-border/30 bg-secondary/15 p-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-foreground leading-normal">{act.description}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {act.amount && (
                      <span className="font-bold text-primary shrink-0 ml-2">
                        {act.amount.toFixed(2)} {act.currency || "XLM"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
