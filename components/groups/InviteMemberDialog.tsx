"use client";

import React, { useState } from "react";
import { Plus, Trash, UserPlus, Users, Wand2 } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { Group } from "@/types/group";
import { generateSampleStellarAddress } from "@/utils/stellarKey";
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

interface InviteMemberDialogProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
}

// Stellar public key validation regex
const stellarAddressRegex = /^G[A-Z2-7]{55}$/;

interface PendingInvite {
  name: string;
  walletAddress: string;
  email?: string;
}

export default function InviteMemberDialog({ group, isOpen, onClose }: InviteMemberDialogProps) {
  const { addMember } = useGroups();
  
  const [newMemName, setNewMemName] = useState("");
  const [newMemWallet, setNewMemWallet] = useState("");
  const [newMemEmail, setNewMemEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  if (!group) return null;

  const handleGenerateSampleWallet = () => {
    const sample = generateSampleStellarAddress();
    setNewMemWallet(sample);
    setMemberError(null);
  };

  const handleAddMemberToList = () => {
    setMemberError(null);

    const name = newMemName.trim();
    const walletAddress = newMemWallet.trim();
    const email = newMemEmail.trim();

    if (!name) {
      setMemberError("Member name is required.");
      return;
    }

    if (!stellarAddressRegex.test(walletAddress)) {
      setMemberError("Invalid Stellar wallet address. Must start with 'G' and be 56 characters.");
      return;
    }

    // Check if duplicate of owner
    if (group.ownerWallet.toLowerCase() === walletAddress.toLowerCase()) {
      setMemberError("The group owner cannot be added as a duplicate member.");
      return;
    }

    // Check if duplicate in active group members list
    const isAlreadyMember = group.members.some(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    if (isAlreadyMember) {
      setMemberError("This wallet address is already a member of this group.");
      return;
    }

    // Check if duplicate in pending list
    const isAlreadyPending = pendingInvites.some(
      (p) => p.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    if (isAlreadyPending) {
      setMemberError("This wallet address has already been added to the pending invites list.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMemberError("Invalid email format.");
      return;
    }

    setPendingInvites([
      ...pendingInvites,
      {
        name,
        walletAddress,
        email: email || undefined,
      },
    ]);

    // Reset fields
    setNewMemName("");
    setNewMemWallet("");
    setNewMemEmail("");
  };

  const handleRemovePending = (index: number) => {
    setPendingInvites(pendingInvites.filter((_, i) => i !== index));
  };

  const handleSendInvites = async () => {
    if (pendingInvites.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    let successCount = 0;
    for (const invite of pendingInvites) {
      try {
        await addMember(group.id, invite.name, invite.walletAddress, invite.email);
        successCount++;
      } catch (err) {
        console.error("Failed to add member:", err);
      }
    }

    if (successCount > 0) {
      toast.success("Members Invited", {
        description: `Successfully added ${successCount} member(s) to "${group.name}".`,
      });
    }

    setIsSubmitting(false);
    setPendingInvites([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Invite Group Members</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite new members by name and Stellar wallet address. They will be added to the contract split ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Member input fields */}
          <div className="grid gap-3 p-3 rounded-xl border border-border/20 bg-secondary/15">
            <div className="grid gap-2">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">Member Name *</label>
              <Input
                type="text"
                placeholder="e.g. Marcus Lee"
                value={newMemName}
                onChange={(e) => setNewMemName(e.target.value)}
                className="rounded-lg h-9 bg-background/20"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">Email Address (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. marcus@stellar.org"
                value={newMemEmail}
                onChange={(e) => setNewMemEmail(e.target.value)}
                className="rounded-lg h-9 bg-background/20"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Stellar Wallet Address *</label>
                <button
                  type="button"
                  onClick={handleGenerateSampleWallet}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Wand2 className="h-3 w-3" /> Auto-generate Sample Key
                </button>
              </div>
              <Input
                type="text"
                placeholder="Starts with G..."
                value={newMemWallet}
                onChange={(e) => setNewMemWallet(e.target.value)}
                className="rounded-lg h-9 bg-background/20 font-mono text-xs"
              />
            </div>

            {memberError && (
              <span className="text-[10px] text-amber-400 font-medium leading-relaxed">{memberError}</span>
            )}

            <Button
              type="button"
              onClick={handleAddMemberToList}
              className="bg-secondary text-foreground hover:bg-secondary/80 w-full mt-1"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Add to Invites List</span>
            </Button>
          </div>

          {/* Pending invites list */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2 border-t border-border/20 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Pending Invites ({pendingInvites.length})
              </h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {pendingInvites.map((invite, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/10 border border-border/20 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">{invite.name}</span>
                      {invite.email && (
                        <span className="text-muted-foreground ml-1">({invite.email})</span>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        {invite.walletAddress}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePending(index)}
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingInvites([]);
                onClose();
              }}
              disabled={isSubmitting}
              className="border-border/60 hover:bg-secondary/40 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendInvites}
              disabled={pendingInvites.length === 0 || isSubmitting}
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-5"
            >
              {isSubmitting ? "Inviting..." : `Send Invites (${pendingInvites.length})`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
