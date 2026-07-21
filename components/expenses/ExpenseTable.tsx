"use client";

import React from "react";
import { Edit, Trash } from "lucide-react";
import { Expense } from "@/types/expense";
import { Member } from "@/types/member";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExpenseTableProps {
  expenses: Expense[];
  members: Member[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export default function ExpenseTable({
  expenses,
  members,
  onEditExpense,
  onDeleteExpense,
}: ExpenseTableProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    return member ? member.name : `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300">
      <Table>
        <TableHeader className="bg-secondary/20">
          <TableRow className="border-border/30">
            <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Title</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Category</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Paid By</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Split Type</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Amount</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id} className="border-border/20 hover:bg-secondary/10">
              <TableCell className="text-xs font-medium text-muted-foreground">
                {formatDate(expense.createdAt)}
              </TableCell>
              <TableCell className="text-xs font-bold text-foreground">
                <div>
                  <p>{expense.title}</p>
                  {expense.description && (
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      {expense.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <span className="bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded text-[10px]">
                  {expense.category}
                </span>
              </TableCell>
              <TableCell className="text-xs font-medium text-foreground">
                {getMemberName(expense.paidBy)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {expense.splitType}
              </TableCell>
              <TableCell className="text-right text-xs font-extrabold text-foreground">
                {expense.amount.toFixed(2)} {expense.currency}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditExpense(expense)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/30 rounded-lg"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteExpense(expense)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
