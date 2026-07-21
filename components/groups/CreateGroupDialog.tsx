"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash, Users, Wand2 } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useWallet } from "@/hooks/useWallet";
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

// Stellar public key validation regex (Starts with G, 56 chars, base32 characters A-Z, 2-7)
const stellarAddressRegex = /^G[A-Z2-7]{55}$/;

const memberSchema = z.object({
  name: z.string().min(1, "Member Name is required"),
  walletAddress: z.string().regex(stellarAddressRegex, "Invalid Stellar address format"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

const createGroupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be under 50 characters"),
  description: z.string().max(300, "Description must be under 300 characters").optional().or(z.literal("")),
  currency: z.enum(["USD", "INR", "EUR", "GBP", "XLM"], {
    message: "Currency is required",
  }),
  initialMembers: z.array(memberSchema),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupDialog({ isOpen, onClose }: CreateGroupDialogProps) {
  const { createGroup } = useGroups();
  const { address: ownerWallet } = useWallet();
  const [memberError, setMemberError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "XLM",
      initialMembers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "initialMembers",
  });

  const [newMemName, setNewMemName] = useState("");
  const [newMemWallet, setNewMemWallet] = useState("");
  const [newMemEmail, setNewMemEmail] = useState("");

  const handleGenerateSampleKey = () => {
    setNewMemWallet(generateSampleStellarAddress());
    setMemberError(null);
  };

  const handleAddMemberToList = () => {
    setMemberError(null);

    if (!newMemName.trim()) {
      setMemberError("Member name is required.");
      return;
    }

    if (!stellarAddressRegex.test(newMemWallet)) {
      setMemberError("Invalid Stellar wallet address. Must start with 'G' and be 56 characters.");
      return;
    }

    if (ownerWallet && newMemWallet.toLowerCase() === ownerWallet.toLowerCase()) {
      setMemberError("The group owner cannot be added as a duplicate member.");
      return;
    }

    // Check duplicates in currently added fields
    const isDuplicate = fields.some(
      (field) => field.walletAddress.toLowerCase() === newMemWallet.toLowerCase()
    );
    if (isDuplicate) {
      setMemberError("A member with this wallet address has already been added.");
      return;
    }

    if (newMemEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemEmail)) {
      setMemberError("Invalid email format.");
      return;
    }

    append({
      name: newMemName.trim(),
      walletAddress: newMemWallet.trim(),
      email: newMemEmail.trim() || undefined,
    });

    // Reset input fields
    setNewMemName("");
    setNewMemWallet("");
    setNewMemEmail("");
  };

  const onSubmit = async (values: CreateGroupFormValues) => {
    if (!ownerWallet) {
      setMemberError("Please connect your Freighter wallet before creating a group.");
      return;
    }

    try {
      const ownerName = `Owner (${ownerWallet.slice(0, 4)}...${ownerWallet.slice(-4)})`;
      
      await createGroup(
        values.name,
        values.description || "",
        values.currency,
        ownerWallet,
        ownerName,
        values.initialMembers
      );

      reset();
      onClose();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Create New Group</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Group splits are powered by Soroban Smart Contracts. Provide group properties and members below.
          </DialogDescription>
        </DialogHeader>

        {!ownerWallet && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-center gap-2">
            <span className="font-semibold">⚠ Wallet not connected.</span>
            <span>Please connect your Freighter wallet before creating a group.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group Name */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Berlin Roommates"
              className="rounded-xl bg-background/30 border-border/40"
              {...register("name")}
            />
            {errors.name && (
              <span className="text-[10px] text-destructive font-medium">{errors.name.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <textarea
              placeholder="e.g. Shared expenses for Apartment 4B bills"
              rows={3}
              className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/60 resize-none"
              {...register("description")}
            />
            {errors.description && (
              <span className="text-[10px] text-destructive font-medium">
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Currency */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Base Currency *
            </label>
            <select
              className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              {...register("currency")}
            >
              <option value="XLM">XLM (Stellar Lumens)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
            {errors.currency && (
              <span className="text-[10px] text-destructive font-medium">
                {errors.currency.message}
              </span>
            )}
          </div>

          {/* Add Initial Members Section */}
          <div className="border-t border-border/20 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Initial Members
              </h4>
              <button
                type="button"
                onClick={handleGenerateSampleKey}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <Wand2 className="h-3 w-3" /> Auto-generate Sample Key
              </button>
            </div>
            
            <div className="grid gap-3 p-3 rounded-xl border border-border/20 bg-secondary/10">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="text"
                  placeholder="Name"
                  value={newMemName}
                  onChange={(e) => setNewMemName(e.target.value)}
                  className="rounded-lg h-8 text-xs bg-background/20"
                />
                <Input
                  type="text"
                  placeholder="Email (Optional)"
                  value={newMemEmail}
                  onChange={(e) => setNewMemEmail(e.target.value)}
                  className="rounded-lg h-8 text-xs bg-background/20"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Stellar Wallet Address (G...)"
                  value={newMemWallet}
                  onChange={(e) => setNewMemWallet(e.target.value)}
                  className="rounded-lg h-8 text-xs bg-background/20 flex-1 font-mono"
                />
                <Button
                  type="button"
                  onClick={handleAddMemberToList}
                  className="bg-secondary text-foreground hover:bg-secondary/80 h-8 rounded-lg text-xs"
                >
                  Add
                </Button>
              </div>

              {memberError && (
                <span className="text-[10px] text-amber-400 font-medium">{memberError}</span>
              )}
            </div>

            {/* Members List inside Dialog */}
            {fields.length > 0 && (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/30 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">{field.name}</span>
                      {field.email && <span className="text-muted-foreground ml-1.5">({field.email})</span>}
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        {field.walletAddress}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-5"
            >
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
