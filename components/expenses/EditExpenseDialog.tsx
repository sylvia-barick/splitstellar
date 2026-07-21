"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit2, Info } from "lucide-react";
import { useExpenseStore } from "@/stores/expenseStore";
import { Group } from "@/types/group";
import { Expense } from "@/types/expense";
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

interface EditExpenseDialogProps {
  group: Group;
  expense: Expense | null;
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

export default function EditExpenseDialog({ group, expense, isOpen, onClose }: EditExpenseDialogProps) {
  const { updateExpense } = useExpenseStore();

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [sharesAllocation, setSharesAllocation] = useState<ParticipantShare[]>([]);
  const [isAllocationValid, setIsAllocationValid] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      paidBy: "",
      splitType: "Equal",
      category: "Others",
    },
  });

  const watchAmount = watch("amount") || 0;
  const watchSplitType = watch("splitType") || "Equal";

  // Pre-fill fields when expense is loaded/opened
  useEffect(() => {
    if (isOpen && expense) {
      reset({
        title: expense.title,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        splitType: expense.splitType,
        category: expense.category,
      });

      setSelectedParticipants(expense.participants.map((p) => p.walletAddress));
      setSubmitError(null);
    }
  }, [isOpen, expense, reset]);

  const handleParticipantsChange = (addresses: string[]) => {
    setSelectedParticipants(addresses);
  };

  const handleSplitChange = (shares: ParticipantShare[], isValid: boolean) => {
    setSharesAllocation(shares);
    setIsAllocationValid(isValid);
  };

  const onSubmit = (values: ExpenseFormValues) => {
    if (!expense) return;

    setSubmitError(null);

    if (selectedParticipants.length === 0) {
      setSubmitError("At least one split participant must be selected.");
      return;
    }

    if (!isAllocationValid) {
      setSubmitError("The split allocation percentages or amounts are invalid.");
      return;
    }

    // Map participants objects for saving
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

    updateExpense(expense.id, {
      title: values.title.trim(),
      description: values.description || "",
      amount: values.amount,
      paidBy: values.paidBy,
      splitType: values.splitType,
      category: values.category,
      participants: mappedParticipants,
    });

    toast.success("Expense Updated", {
      description: `Successfully updated expense "${values.title}".`,
    });

    onClose();
  };

  const selectedMembersList = group.members.filter((m) =>
    selectedParticipants.includes(m.walletAddress)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            <span>Edit Expense</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update expense details. Dynamic balances will update immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expense Title *
            </label>
            <Input
              type="text"
              placeholder="e.g. Weekly Groceries"
              className="rounded-xl bg-background/30 border-border/40"
              {...register("title")}
            />
            {errors.title && (
              <span className="text-[10px] text-destructive font-medium">{errors.title.message}</span>
            )}
          </div>

          {/* Amount & Category */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                <span className="text-[10px] text-destructive font-medium">
                  {errors.amount.message}
                </span>
              )}
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category *
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("category")}
              >
                <option value="Food">Food 🍔</option>
                <option value="Travel">Travel ✈️</option>
                <option value="Rent">Rent 🏠</option>
                <option value="Shopping">Shopping 🛍️</option>
                <option value="Utilities">Utilities ⚡</option>
                <option value="Entertainment">Entertainment 🎬</option>
                <option value="Others">Others 📦</option>
              </select>
            </div>
          </div>

          {/* Paid By & Split Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Paid By *
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("paidBy")}
              >
                {group.members.map((member) => (
                  <option key={member.id} value={member.walletAddress}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Split Method *
              </label>
              <select
                className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                {...register("splitType")}
              >
                <option value="Equal">Equally</option>
                <option value="Percentage">By Percentage</option>
                <option value="Custom">Custom Amount / Exact Shares</option>
                <option value="Shares">By Ratio / Shares</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Notes / Description
            </label>
            <textarea
              placeholder="e.g. Rewe supermarket bill"
              rows={2}
              className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/60 resize-none"
              {...register("description")}
            />
          </div>

          {/* Participant Selector */}
          <div className="border-t border-border/20 pt-4">
            <ParticipantSelector
              members={group.members}
              selectedWalletAddresses={selectedParticipants}
              onChange={handleParticipantsChange}
            />
          </div>

          {/* Split Allocation Selector */}
          <div className="border-t border-border/20 pt-4">
            <SplitSelector
              splitType={watchSplitType}
              totalAmount={watchAmount}
              currency={group.currency}
              selectedMembers={selectedMembersList}
              onChange={handleSplitChange}
            />
          </div>

          {submitError && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5 text-xs text-amber-400">
              <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
