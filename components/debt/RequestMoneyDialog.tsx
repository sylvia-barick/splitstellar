"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
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

interface RequestMoneyDialogProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestMoneyDialog({ group, isOpen, onClose }: RequestMoneyDialogProps) {
  const { address: userWallet } = useWallet();
  const { createMoneyRequest } = useRequestStore();
  const { addActivity } = useActivityStore();

  const [targetAddress, setTargetAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTargets = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== (userWallet || "").toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const requester = userWallet;
    if (!requester) {
      setError("Please connect your wallet to make a money request.");
      return;
    }

    if (!targetAddress) {
      setError("Please select a member to request money from.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid request amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetMember = group.members.find(
        (m) => m.walletAddress.toLowerCase() === targetAddress.toLowerCase()
      );

      const requesterMember = group.members.find(
        (m) => m.walletAddress.toLowerCase() === requester.toLowerCase()
      );

      await createMoneyRequest(
        group.id,
        requester,
        targetAddress,
        parsedAmount,
        group.currency,
        note.trim() || "Money request"
      );

      addActivity(
        group.id,
        requester,
        requesterMember?.name || "Member",
        "RequestCreated",
        `${requesterMember?.name || "Member"} requested ${parsedAmount.toFixed(2)} ${group.currency} from ${targetMember?.name || "Member"}`,
        parsedAmount,
        group.currency
      );

      toast.success("Money Request Sent", {
        description: `Requested ${parsedAmount.toFixed(2)} ${group.currency} from ${targetMember?.name || "member"}.`,
      });

      setAmount("");
      setNote("");
      onClose();
    } catch (err) {
      console.error("Failed to create money request:", err);
      setError(err instanceof Error ? err.message : "Failed to create money request on blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <span>Request Money</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Send a money request to another group member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Select Target */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Request From (Debtor) *
            </label>
            <select
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              <option value="">-- Select Member --</option>
              {availableTargets.map((m) => (
                <option key={m.id} value={m.walletAddress}>
                  {m.name} ({m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Requested Amount ({group.currency}) *
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 100"
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
              placeholder="e.g. Shared grocery bill"
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
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-5"
            >
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
