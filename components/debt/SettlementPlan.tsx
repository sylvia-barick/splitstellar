"use client";

import React, { useMemo, useState } from "react";
import { HandCoins, Send, CheckCircle2, DollarSign, Clock, ArrowRight, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { Group } from "@/types/group";
import { Debt } from "@/types/debt";
import { MoneyRequest } from "@/types/payment";
import { useWallet } from "@/hooks/useWallet";
import { settlementAdapter } from "@/services/settlementAdapter";
import { useExpenseStore } from "@/stores/expenseStore";
import { useDebtStore } from "@/stores/debtStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SettlementSummary from "./SettlementSummary";
import BalanceComparison from "./BalanceComparison";
import SettlementPreview from "./SettlementPreview";
import WhoOwesWhomPanel from "./WhoOwesWhomPanel";
import DirectLoanDialog from "./DirectLoanDialog";
import RequestMoneyDialog from "./RequestMoneyDialog";
import NoDebtState from "./NoDebtState";
import SettlementCard from "./SettlementCard";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SettlementPlanProps {
  group: Group;
}

export default function SettlementPlanView({ group }: SettlementPlanProps) {
  const { address: userWallet } = useWallet();
  const expenses = useExpenseStore((state) => state.expenses);
  const calculateBalances = useExpenseStore((state) => state.calculateBalances);
  const calculateSettlementPlan = useDebtStore((state) => state.calculateSettlementPlan);

  const { createPayment, markAsPaid, confirmReceipt, getPaymentsByGroup } = usePaymentStore();
  const { getRequestsByGroup, respondToRequest, markRequestAsPaidWithTx } = useRequestStore();
  const { addActivity } = useActivityStore();

  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isProcessingRequestId, setIsProcessingRequestId] = useState<string | null>(null);

  const handleAcceptAndPayRequest = async (req: MoneyRequest) => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the payment transaction.",
      });
      return;
    }

    if (userWallet.toLowerCase() !== req.to.toLowerCase()) {
      toast.error("Permission Denied", {
        description: "Only the designated payer can accept & pay this request.",
      });
      return;
    }

    setIsProcessingRequestId(req.id);
    toast.info("Opening Freighter Wallet...", {
      description: `Please sign the ${req.amount.toFixed(2)} ${req.currency} payment transaction to ${getMemberName(req.from)} on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: userWallet,
        receiverWallet: req.from,
        amount: req.amount,
        currency: req.currency,
        groupId: req.groupId,
        note: req.note || "Money Request Payment",
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar transaction signature was rejected or submission failed.");
      }

      // 1. Update Money Request status to Paid with tx hash and ledger
      await markRequestAsPaidWithTx(req.id, result.hash, result.ledger);

      // 2. Create Payment record for transactions list, analytics, and balances
      const newPayment = await createPayment(
        req.groupId,
        req.to,
        req.from,
        req.amount,
        req.currency,
        req.note || "Money Request Payment",
        result.hash,
        result.ledger,
        undefined
      );
      await confirmReceipt(newPayment.id, result.hash, result.ledger);

      // 3. Add activity log
      const payerName = getMemberName(req.to);
      const requesterName = getMemberName(req.from);
      addActivity(
        req.groupId,
        userWallet,
        payerName,
        "PaymentConfirmed",
        `${payerName} paid ${requesterName} ${req.amount.toFixed(2)} ${req.currency} for Money Request on Stellar Testnet (Tx Hash: ${result.hash.slice(0, 8)}...)`,
        req.amount,
        req.currency
      );

      // 4. Force balance recalculation in expense store
      useExpenseStore.getState().calculateBalances(req.groupId);

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
      toast.error("Payment Failed", {
        description: msg,
      });
    } finally {
      setIsProcessingRequestId(null);
    }
  };

  const handleReturnMoney = async (req: MoneyRequest) => {
    if (!userWallet) {
      toast.error("Freighter Wallet Disconnected", {
        description: "Please connect your Freighter wallet to sign the return payment transaction.",
      });
      return;
    }

    const isDirectLoan = req.type === "DirectLoan";
    const returnSender = isDirectLoan ? req.to : req.from;
    const returnReceiver = isDirectLoan ? req.from : req.to;

    if (userWallet.toLowerCase() !== returnSender.toLowerCase()) {
      toast.error("Permission Denied", {
        description: isDirectLoan
          ? "Only the borrower can repay the direct loan."
          : "Only the requester who received funds can return the money.",
      });
      return;
    }

    setIsProcessingRequestId(req.id);
    toast.info("Opening Freighter Wallet...", {
      description: `Please sign the ${req.amount.toFixed(2)} ${req.currency} payment transaction to return money back to ${getMemberName(returnReceiver)} on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: userWallet,
        receiverWallet: returnReceiver,
        amount: req.amount,
        currency: req.currency,
        groupId: req.groupId,
        note: req.note ? `Returned: ${req.note}` : (isDirectLoan ? "Repaid Direct Loan" : "Returned Money Request"),
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Stellar transaction signature was rejected or submission failed.");
      }

      // 1. Mark request as Completed with returnTxHash
      const { returnRequestedMoney } = useRequestStore.getState();
      await returnRequestedMoney(req.id, result.hash, result.ledger);

      // 2. Create Payment record from returnSender to returnReceiver
      const newPayment = await createPayment(
        req.groupId,
        returnSender,
        returnReceiver,
        req.amount,
        req.currency,
        req.note ? `Returned: ${req.note}` : (isDirectLoan ? "Repaid Direct Loan" : "Returned Money Request"),
        result.hash,
        result.ledger,
        undefined
      );
      await confirmReceipt(newPayment.id, result.hash, result.ledger);

      // 3. Add activity log
      const requesterName = getMemberName(req.from);
      const payerName = getMemberName(req.to);
      addActivity(
        req.groupId,
        userWallet,
        requesterName,
        "PaymentConfirmed",
        `${requesterName} returned ${req.amount.toFixed(2)} ${req.currency} back to ${payerName} on Stellar Testnet (Tx Hash: ${result.hash.slice(0, 8)}...)`,
        req.amount,
        req.currency
      );

      // 4. Force balance recalculation in expense store
      useExpenseStore.getState().calculateBalances(req.groupId);

      toast.success("Money Returned on Stellar Testnet!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to return money on Stellar Testnet.";
      toast.error("Return Payment Failed", {
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

  const groupExpenses = useMemo(
    () => expenses.filter((e) => e.groupId === group.id),
    [expenses, group.id]
  );

  const memberAddresses = useMemo(
    () => group.members.map((m) => m.walletAddress),
    [group.members]
  );

  // Re-fetch payments and requests for reactive calculation
  const payments = usePaymentStore((state) => state.payments);
  const requests = useRequestStore((state) => state.requests);

  const balances = useMemo(
    () => calculateBalances(group.id, memberAddresses),
    [expenses, payments, requests, group.id, memberAddresses, calculateBalances]
  );

  const plan = useMemo(
    () => calculateSettlementPlan(group.id, group.currency, balances, groupExpenses),
    [group.id, group.currency, balances, groupExpenses, calculateSettlementPlan]
  );

  const groupPayments = useMemo(
    () => getPaymentsByGroup(group.id),
    [payments, group.id, getPaymentsByGroup]
  );

  const groupRequests = useMemo(
    () => getRequestsByGroup(group.id),
    [requests, group.id, getRequestsByGroup]
  );

  const getMemberName = (walletAddress: string) => {
    const member = group.members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return member ? member.name : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  const [isPayingId, setIsPayingId] = useState<string | null>(null);

  const handlePayNow = async (debt: Debt) => {
    if (!userWallet) {
      toast.error("Please connect your Freighter wallet to execute payment.");
      return;
    }

    if (userWallet.toLowerCase() !== debt.from.toLowerCase()) {
      toast.error("Only the debtor can execute this payment.");
      return;
    }

    setIsPayingId(debt.id);
    toast.info("Opening Freighter...", {
      description: `Please sign the ${debt.amount.toFixed(2)} ${debt.currency} payment transaction on Stellar Testnet.`,
    });

    try {
      const result = await settlementAdapter.executeSettlement({
        senderWallet: debt.from,
        receiverWallet: debt.to,
        amount: debt.amount,
        currency: debt.currency,
        groupId: group.id,
      });

      if (!result.success || !result.hash) {
        throw new Error(result.error || "Transaction signature rejected or submission failed.");
      }

      // Record completed payment with real Stellar transaction hash & ledger number
      const newPayment = await createPayment(
        group.id,
        debt.from,
        debt.to,
        debt.amount,
        debt.currency,
        `Settlement transfer (Tx: ${result.hash.slice(0, 8)}...)`,
        result.hash,
        result.ledger
      );
      await confirmReceipt(newPayment.id);

      const payerName = getMemberName(debt.from);
      const receiverName = getMemberName(debt.to);

      addActivity(
        group.id,
        debt.from,
        payerName,
        "PaymentConfirmed",
        `${payerName} paid ${receiverName} ${debt.amount.toFixed(2)} ${debt.currency} on Stellar Testnet (Hash: ${result.hash.slice(0, 6)}...)`,
        debt.amount,
        debt.currency
      );

      toast.success("On-Chain Payment Confirmed!", {
        description: `Ledger #${result.ledger || "N/A"} - Hash: ${result.hash.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(`https://stellar.expert/explorer/testnet/tx/${result.hash}`, "_blank"),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit transaction to Stellar Testnet. Balances unchanged.";
      toast.error("Settlement Payment Failed", {
        description: msg,
      });
    } finally {
      setIsPayingId(null);
    }
  };

  // Derive debtors & creditors count
  const peopleOwing = useMemo(
    () => Object.values(balances).filter((b) => b.netBalance < -0.01).length,
    [balances]
  );

  const peopleReceiving = useMemo(
    () => Object.values(balances).filter((b) => b.netBalance > 0.01).length,
    [balances]
  );

  const transactionsSaved = Math.max(
    0,
    plan.originalTransactionsCount - plan.totalTransactions
  );

  const activeAddr = (userWallet || "").toLowerCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/20 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Settlement Engine</h2>
          <p className="text-xs text-muted-foreground">
            Minimum Cash Flow transfers & interactive Stellar Testnet payment workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsLoanDialogOpen(true)}
            variant="outline"
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs rounded-xl flex items-center space-x-1.5 h-9"
          >
            <HandCoins className="h-4 w-4" />
            <span>Lend Direct Loan</span>
          </Button>

          <Button
            onClick={() => setIsRequestDialogOpen(true)}
            className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs rounded-xl flex items-center space-x-1.5 h-9 font-semibold"
          >
            <Send className="h-4 w-4" />
            <span>Request Money</span>
          </Button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <SettlementSummary
        peopleOwing={peopleOwing}
        peopleReceiving={peopleReceiving}
        totalDebt={plan.totalAmount}
        transactionsSaved={transactionsSaved}
        currency={group.currency}
      />

      {/* 2. Who Owes Whom Panel */}
      <WhoOwesWhomPanel debts={plan.transactions} members={group.members} currency={group.currency} />

      {/* 3. Algorithm Comparison Banner */}
      <BalanceComparison
        originalTxCount={plan.originalTransactionsCount}
        optimizedTxCount={plan.totalTransactions}
        reductionPercentage={plan.reductionPercentage}
      />

      {/* 4. Visual Flow Preview */}
      <SettlementPreview
        balances={balances}
        debts={plan.transactions}
        members={group.members}
        currency={group.currency}
      />

      {/* 5. Interactive Settlement Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span>Settlement Payment Workflow</span>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] lowercase font-mono">
              debt simplification cards
            </Badge>
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Real Stellar Testnet On-Chain Payments
          </span>
        </div>

        {plan.transactions.length === 0 ? (
          <NoDebtState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.transactions.map((debt) => (
              <SettlementCard
                key={debt.id}
                debt={debt}
                members={group.members}
                groupId={group.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* 6. Money Requests Section */}
      {groupRequests.length > 0 && (
        <div className="space-y-3 border-t border-border/20 pt-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>Money Requests & Direct Loans</span>
          </h3>

          <div className="rounded-2xl border border-border/30 bg-card/25 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="border-border/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Requester / Lender</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Target / Borrower</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupRequests.map((req) => {
                  const isTarget = req.to.toLowerCase() === activeAddr;
                  const isPaid = req.status === "Paid" || req.status === "Completed";
                  const txHash = req.transactionHash;

                  return (
                    <TableRow key={req.id} className="border-border/20 hover:bg-secondary/10">
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={
                            req.type === "DirectLoan"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]"
                              : "bg-primary/10 text-primary border-primary/20 text-[10px]"
                          }
                        >
                          {req.type === "DirectLoan" ? "Direct Loan" : "Request"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-foreground">
                        {getMemberName(req.from)}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-foreground">
                        {getMemberName(req.to)}
                      </TableCell>

                      <TableCell className="text-right text-xs font-black text-foreground">
                        {req.amount.toFixed(2)} {req.currency}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            req.status === "Completed"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]"
                              : isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                              : req.status === "Rejected"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                          }
                        >
                          {req.status === "Completed" ? "Returned" : req.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {req.status === "Pending" && isTarget ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleAcceptAndPayRequest(req)}
                              disabled={isProcessingRequestId === req.id}
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              {isProcessingRequestId === req.id ? (
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
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={isProcessingRequestId === req.id}
                              size="sm"
                              variant="ghost"
                              className="text-rose-400 hover:bg-rose-500/10 text-[10px] rounded-lg h-7 px-2 font-semibold"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : ((req.type === "DirectLoan" && req.status === "Accepted" && req.to.toLowerCase() === activeAddr) ||
                             (req.type !== "DirectLoan" && req.status === "Paid" && req.from.toLowerCase() === activeAddr)) ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleReturnMoney(req)}
                              disabled={isProcessingRequestId === req.id}
                              size="sm"
                              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              {isProcessingRequestId === req.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Signing...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
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
                                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[10px] rounded-lg h-6 px-2 font-semibold flex items-center gap-1"
                              >
                                <span>Paid Tx</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : isPaid ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Badge
                              variant="outline"
                              className={
                                req.status === "Completed"
                                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-[10px]"
                                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                              }
                            >
                              {req.status === "Completed" ? "Returned" : "Paid"}
                            </Badge>
                            {(req.returnTxHash || txHash) && (
                              <Button
                                onClick={() =>
                                  window.open(
                                    `https://stellar.expert/explorer/testnet/tx/${req.returnTxHash || txHash}`,
                                    "_blank"
                                  )
                                }
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[10px] rounded-lg h-6 px-2 font-semibold flex items-center gap-1"
                              >
                                <span>View Tx</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      <DirectLoanDialog
        group={group}
        isOpen={isLoanDialogOpen}
        onClose={() => setIsLoanDialogOpen(false)}
      />

      <RequestMoneyDialog
        group={group}
        isOpen={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
      />
    </div>
  );
}
