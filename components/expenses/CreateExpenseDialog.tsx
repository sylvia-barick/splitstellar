"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Info } from "lucide-react";
import { useExpenseStore } from "@/stores/expenseStore";
import { Group } from "@/types/group";
import { useWallet } from "@/hooks/useWallet";
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
import ParticipantSelector from "./ParticipantSelector";
import SplitSelector, { ParticipantShare } from "./SplitSelector";
import { toast } from "sonner";

interface CreateExpenseDialogProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}

const expenseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(200, "Description must be under 200 characters").optional().or(z.literal("")),
  amount: z.number().positive("Amount must be greater than 0"),
  paidBy: z.string().min(1, "Payer is required"),
  splitType: z.enum(["Equal", "Percentage", "Custom", "Shares"]),
  category: z.enum(["Food", "Travel", "Rent", "Shopping", "Utilities", "Entertainment", "Others"]),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function CreateExpenseDialog({ group, isOpen, onClose }: CreateExpenseDialogProps) {
  const { createExpense } = useExpenseStore();
  const { address: userWallet } = useWallet();

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [sharesAllocation, setSharesAllocation] = useState<ParticipantShare[]>([]);
  const [isAllocationValid, setIsAllocationValid] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      paidBy: userWallet || group.members[0]?.walletAddress || "",
      splitType: "Equal",
      category: "Food",
    },
  });

  const watchAmount = watch("amount") || 0;
  const watchSplitType = watch("splitType") || "Equal";

  // Pre-fill participants and default payer when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedParticipants(group.members.map((m) => m.walletAddress));
      setSubmitError(null);
      const defaultPayer = group.members.find(
        (m) => m.walletAddress.toLowerCase() === (userWallet || "").toLowerCase()
      )?.walletAddress || group.members[0]?.walletAddress || "";
      setValue("paidBy", defaultPayer);
    }
  }, [isOpen, group.members, userWallet, setValue]);

  const handleParticipantsChange = (addresses: string[]) => {
    setSelectedParticipants(addresses);
  };

  const handleSplitChange = (shares: ParticipantShare[], isValid: boolean) => {
    setSharesAllocation(shares);
    setIsAllocationValid(isValid);
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitError(null);

    if (selectedParticipants.length === 0) {
      setSubmitError("At least one split participant must be selected.");
      return;
    }

    if (!isAllocationValid) {
      setSubmitError("The split allocation percentages or amounts are invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const mappedParticipants = sharesAllocation.map((share) => {
        const member = group.members.find(
          (m) => m.walletAddress.toLowerCase() === share.walletAddress.toLowerCase()
        );
        return {
          walletAddress: share.walletAddress,
          memberName: member?.name || share.memberName || "Unknown Member",
          shareAmount: share.shareAmount,
          sharePercentage: share.sharePercentage,
          isPaid: share.walletAddress.toLowerCase() === values.paidBy.toLowerCase(),
        };
      });

      await createExpense({
        groupId: group.id,
        title: values.title.trim(),
        description: values.description || "",
        amount: values.amount,
        currency: group.currency,
        paidBy: values.paidBy,
        splitType: values.splitType,
        category: values.category,
        participants: mappedParticipants,
      });

      toast.success("Expense Added", {
        description: `Successfully added expense "${values.title}" (${values.amount} ${group.currency}).`,
      });

      reset();
      onClose();
    } catch (err) {
      console.error("Failed to add expense:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to create expense on blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMembersList = group.members.filter((m) =>
    selectedParticipants.includes(m.walletAddress)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <span>Add New Expense</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an expense bill for group <strong>{group.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expense Title *
            </label>
            <Input
              type="text"
              placeholder="e.g. Group Dinner, Uber Ride"
              className="rounded-xl bg-background/30 border-border/40"
              {...register("title")}
            />
            {errors.title && (
              <span className="text-[10px] text-destructive font-medium">{errors.title.message}</span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Amount ({group.currency}) *
              </label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                className="rounded-xl bg-background/30 border-border/40"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <span className="text-[10px] text-destructive font-medium">{errors.amount.message}</span>
              )}
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Paid By *
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("paidBy")}
              >
                {group.members.map((m) => (
                  <option key={m.id} value={m.walletAddress}>
                    {m.name} ({m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("category")}
              >
                <option value="Food">Food & Dining</option>
                <option value="Travel">Travel & Transport</option>
                <option value="Rent">Rent & Living</option>
                <option value="Shopping">Shopping</option>
                <option value="Utilities">Utilities & Bills</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Split Type
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("splitType")}
              >
                <option value="Equal">Equal Split</option>
                <option value="Percentage">Percentage (%) Split</option>
                <option value="Shares">Shares Ratio Split</option>
                <option value="Custom">Custom Amount Split</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add extra details..."
              rows={2}
              className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40 resize-none"
              {...register("description")}
            />
          </div>

          <ParticipantSelector
            members={group.members}
            selectedWalletAddresses={selectedParticipants}
            onChange={handleParticipantsChange}
          />

          <SplitSelector
            splitType={watchSplitType}
            totalAmount={watchAmount}
            currency={group.currency}
            selectedMembers={selectedMembersList}
            onChange={handleSplitChange}
          />

          {submitError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

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
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
