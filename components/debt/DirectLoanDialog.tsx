"use client";

import React, { useState } from "react";
import { HandCoins } from "lucide-react";
import { Group } from "@/types/group";
import { useWallet } from "@/hooks/useWallet";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DirectLoanDialogProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}

export default function DirectLoanDialog({ group, isOpen, onClose }: DirectLoanDialogProps) {
  const { address: userWallet } = useWallet();
  const { createDirectLoan } = useRequestStore();
  const { addActivity } = useActivityStore();

  const [borrowerAddress, setBorrowerAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableBorrowers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== (userWallet || "").toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lender = userWallet;
    if (!lender) {
      setError("Please connect your wallet to create a direct loan.");
      return;
    }

    if (!borrowerAddress) {
      setError("Please select a member to lend to.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid loan amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const borrowerMember = group.members.find(
        (m) => m.walletAddress.toLowerCase() === borrowerAddress.toLowerCase()
      );

      const lenderMember = group.members.find(
        (m) => m.walletAddress.toLowerCase() === lender.toLowerCase()
      );

      await createDirectLoan(
        group.id,
        lender,
        borrowerAddress,
        parsedAmount,
        group.currency,
        note.trim() || "Direct loan"
      );

      addActivity(
        group.id,
        lender,
        lenderMember?.name || "Member",
        "DirectLoanCreated",
        `${lenderMember?.name || "Member"} lent ${borrowerMember?.name || "Member"} ${parsedAmount.toFixed(2)} ${group.currency}`,
        parsedAmount,
        group.currency
      );

      toast.success("Direct Loan Created", {
        description: `Lent ${parsedAmount.toFixed(2)} ${group.currency} to ${borrowerMember?.name || "member"}.`,
      });

      setAmount("");
      setNote("");
      onClose();
    } catch (err) {
      console.error("Failed to create direct loan:", err);
      setError(err instanceof Error ? err.message : "Failed to create direct loan on blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-indigo-400" />
            <span>Lend Direct Loan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lend money directly to another member in this group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Select Borrower */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Borrower (Lend To) *
            </label>
            <select
              value={borrowerAddress}
              onChange={(e) => setBorrowerAddress(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              <option value="">-- Select Member --</option>
              {availableBorrowers.map((m) => (
                <option key={m.id} value={m.walletAddress}>
                  {m.name} ({m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Loan Amount ({group.currency}) *
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl bg-background/30 border-border/40"
            />
          </div>

          {/* Note */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason / Note
            </label>
            <Input
              type="text"
              placeholder="e.g. Cash loan for taxi"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl bg-background/30 border-border/40"
            />
          </div>

          {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}

          <DialogFooter className="border-t border-border/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-border/60 hover:bg-secondary/40 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5"
            >
              {isSubmitting ? "Lending..." : "Create Direct Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
