"use client";

import React, { useState } from "react";
import { UserPlus, Sparkles, KeyRound } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { groupRepository } from "@/services/groupRepository";
import { useGroupStore } from "@/stores/groupStore";
import { formatInviteCode, isValidInviteCodeFormat } from "@/utils/inviteCode";
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

interface JoinGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

export default function JoinGroupDialog({ isOpen, onClose, onSuccess }: JoinGroupDialogProps) {
  const { address: userWallet, isConnected, connect } = useWallet();
  const { syncWithServer } = useGroupStore();

  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setInviteCode(formatInviteCode(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !userWallet) {
      try {
        await connect();
      } catch (err) {
        setError("Please connect your Freighter wallet to join a group.");
        return;
      }
    }

    const trimmedCode = inviteCode.trim().toUpperCase();
    if (!isValidInviteCodeFormat(trimmedCode)) {
      setError("Invalid invite code format. Example: SPLIT-7KQ9X2");
      return;
    }

    setIsSubmitting(true);
    try {
      const group = await groupRepository.joinGroupByInviteCode(trimmedCode, userWallet!);
      await syncWithServer(userWallet!);

      toast.success("Joined Group Successfully!", {
        description: `You are now a member of "${group.name}".`,
      });

      setInviteCode("");
      onClose();
      if (onSuccess) onSuccess(group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Join Group via Invite Code</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter the unique group invite code (e.g. <span className="font-mono text-primary font-bold">SPLIT-7KQ9X2</span>) to join a shared expense ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Invite Code *</span>
              <span className="text-[10px] text-muted-foreground font-mono">Format: SPLIT-XXXXXX</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="SPLIT-7KQ9X2"
                value={inviteCode}
                onChange={handleInputChange}
                className="pl-9 font-mono text-sm uppercase font-bold tracking-wider rounded-xl bg-background/30 border-border/40"
              />
            </div>
          </div>

          {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}

          <DialogFooter className="border-t border-border/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/60 hover:bg-secondary/40 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-5"
            >
              {isSubmitting ? "Joining..." : "Join Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
