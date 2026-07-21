"use client";

import React from "react";
import { useExpenseStore } from "@/stores/expenseStore";
import { Expense } from "@/types/expense";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteExpenseDialog({ expense, isOpen, onClose }: DeleteExpenseDialogProps) {
  const { deleteExpense } = useExpenseStore();

  const handleDelete = async () => {
    if (!expense) return;
    try {
      await deleteExpense(expense.id);
      toast.success("Expense Deleted", {
        description: `Successfully deleted expense "${expense.title}".`,
      });
    } catch (err) {
      console.error("Failed to delete expense:", err);
      toast.error("Failed to delete expense");
    } finally {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card border-border/80 text-foreground rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-destructive">
            Delete Expense?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete the expense &ldquo;{expense?.title}&rdquo;? Balances will be recalculated. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border/20 pt-4">
          <AlertDialogCancel onClick={onClose} className="border-border/60 hover:bg-secondary/40 rounded-xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-xl"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
