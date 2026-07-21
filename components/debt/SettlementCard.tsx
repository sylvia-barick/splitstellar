"use client";

import React, { useState } from "react";
import { DollarSign, ShieldCheck, ExternalLink, Loader2, Clock, User, CheckCircle2 } from "lucide-react";
import { Debt } from "@/types/debt";
import { Member } from "@/types/member";
import { useWallet } from "@/hooks/useWallet";
import { settlementAdapter } from "@/services/settlementAdapter";
import { usePaymentStore } from "@/stores/paymentStore";
import { useActivityStore } from "@/stores/activityStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SettlementCardProps {
  debt: Debt;
  members: Member[];
  groupId: string;
  onPaymentSuccess?: () => void;
}

export default function SettlementCard({
  debt,
  members,
  groupId,
  onPaymentSuccess,
}: SettlementCardProps) {
  const { address: userWallet } = useWallet();
  const payments = usePaymentStore((state) => state.payments);
  const createPayment = usePaymentStore((state) => state.createPayment);
  const confirmReceipt = usePaymentStore((state) => state.confirmReceipt);
  const addActivity = useActivityStore((state) => state.addActivity);

  const [isPaying, setIsPaying] = useState(false);

  const activeAddr = (userWallet || "").toLowerCase();
  const debtorAddr = debt.from.toLowerCase();
  const creditorAddr = debt.to.toLowerCase();

  const isDebtor = activeAddr === debtorAddr;
  const isCreditor = activeAddr === creditorAddr;

  const getMemberName = (walletAddress: string) => {
    const member = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    if (member) return member.name;
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  const debtorName = getMemberName(debt.from);
  const creditorName = getMemberName(debt.to);

  // Check if this settlement has already been paid on-chain
  const matchingPayment = payments.find(
    (p) =>
      p.groupId === groupId &&
      p.from.toLowerCase() === debtorAddr &&
      p.to.toLowerCase() === creditorAddr &&
      (p.status === "Paid" || p.status === "Completed" || p.status === "Confirmed")
  );

  const isPaid = Boolean(matchingPayment);
  const txHash = matchingPayment?.transactionHash;

  const handlePayWithFreighter = async () => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the Stellar transaction.",
      });
      return;
    }

    if (!isDebtor) {
      toast.error("Permission Denied", {
        description: "Only the debtor can execute this payment transaction.",
      });
      return;
    }

    setIsPaying(true);
    toast.info("Opening Freighter Wallet...", {
      description: `Sign ${debt.amount.toFixed(2)} ${debt.currency} payment operation on Stellar Testnet.`,
    });

    try {
      // 1. Execute Real Stellar Payment via Freighter
      const senderPublicKey = (userWallet && userWallet.toLowerCase() === debtorAddr) ? userWallet : debt.from;
      const result = await settlementAdapter.executeSettlement({
        senderWallet: senderPublicKey,
        receiverWallet: debt.to,
        amount: debt.amount,
        currency: debt.currency,
        groupId,
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar payment transaction failed or signature was rejected.");
      }

      // 2. Save payment record on success with transaction hash, sender, receiver, ledger, timestamp, groupId, settlementId, amount
      const newPayment = await createPayment(
        groupId,
        debt.from,
        debt.to,
        debt.amount,
        debt.currency,
        `Settlement transfer (Tx: ${result.hash.slice(0, 8)}...)`,
        result.hash,
        result.ledger,
        debt.id
      );

      await confirmReceipt(newPayment.id, result.hash, result.ledger);

      // 3. Record Live Activity
      await addActivity(
        groupId,
        debt.from,
        debtorName,
        "PaymentConfirmed",
        `${debtorName} paid ${creditorName} ${debt.amount.toFixed(2)} ${debt.currency} on Stellar Testnet (Tx Hash: ${result.hash.slice(0, 8)}...)`,
        debt.amount,
        debt.currency
      );

      // 4. Force balance recalculation in expenseStore
      useExpenseStore.getState().calculateBalances(groupId);

      toast.success("Payment Confirmed on Stellar Testnet!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });

      onPaymentSuccess?.();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Payment transaction failed. Balances remain unchanged.";
      toast.error("Stellar Payment Failed", {
        description: errorMsg,
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-md hover:border-primary/40 transition-all duration-300 shadow-lg group">
      {/* Background Accent Glow */}
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-all ${
          isPaid ? "bg-emerald-500" : isDebtor ? "bg-amber-500" : "bg-primary"
        }`}
      />

      <CardContent className="p-5 space-y-4">
        {/* Top Header: Debtor -> Creditor Summary */}
        <div className="flex items-start justify-between gap-3">
          {/* Debtor Details */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-foreground truncate">{debtorName}</span>
                {isDebtor && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[9px] px-1.5 py-0">You</Badge>
                )}
              </div>
              <span className="text-[11px] font-semibold text-amber-400/90 block uppercase tracking-wider">
                Debtor
              </span>
            </div>
          </div>

          {/* Owes Tag */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <Badge variant="outline" className="bg-secondary/40 text-muted-foreground text-[10px] uppercase font-mono px-2 py-0.5 border-border/40">
              Owes
            </Badge>
          </div>

          {/* Creditor Details */}
          <div className="flex items-center space-x-3 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <div className="flex items-center justify-end space-x-1.5">
                {isCreditor && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[9px] px-1.5 py-0">You</Badge>
                )}
                <span className="text-sm font-bold text-foreground truncate">{creditorName}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400/90 block uppercase tracking-wider">
                Creditor
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Middle Section: Settlement Amount & Status */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/30 bg-secondary/15 backdrop-blur-sm">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Settlement Amount
            </span>
            <div className="text-xl font-black text-foreground flex items-center space-x-1">
              <span>{debt.amount.toFixed(2)}</span>
              <span className="text-sm font-bold text-primary">{debt.currency}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
              Status
            </span>
            <Badge
              variant="outline"
              className={
                isPaid
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5"
              }
            >
              {isPaid ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Paid
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-pulse" /> Pending
                </span>
              )}
            </Badge>
          </div>
        </div>

        {/* Bottom Actions Section */}
        <div className="pt-1 flex items-center justify-between gap-3">
          {isPaid ? (
            /* Requirement 8: Disable Pay after payment, Replace with View Transaction */
            <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                {isCreditor ? "Payment Received" : "Payment Confirmed On-Chain"}
              </span>

              {txHash && (
                <Button
                  onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${txHash}`, "_blank")}
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs rounded-xl h-7 px-3 flex items-center gap-1 font-semibold"
                >
                  <span>View Transaction</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : isDebtor ? (
            /* Requirement 2 & 3 & 4 & 5: Only debtor sees Pay button */
            <Button
              onClick={handlePayWithFreighter}
              disabled={isPaying}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl h-10 shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in Freighter...</span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  <span>Pay with Freighter</span>
                </>
              )}
            </Button>
          ) : isCreditor ? (
            /* Requirement 2: Creditor NEVER sees Pay, only Waiting for Payment */
            <div className="w-full text-center py-2 px-3 rounded-xl bg-secondary/30 border border-border/30 text-xs text-muted-foreground font-semibold italic flex items-center justify-center space-x-2">
              <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Waiting for Payment</span>
            </div>
          ) : (
            /* Other group members view */
            <div className="w-full text-center py-2 text-xs text-muted-foreground/60 font-medium">
              Pending Debtor Settlement
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
