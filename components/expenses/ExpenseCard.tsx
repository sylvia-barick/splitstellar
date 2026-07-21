"use client";

import React from "react";
import { Calendar, User, Users, Trash2, Edit } from "lucide-react";
import { Expense } from "@/types/expense";
import { Member } from "@/types/member";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExpenseCardProps {
  expense: Expense;
  members: Member[];
  onEdit: () => void;
  onDelete: () => void;
}

export default function ExpenseCard({ expense, members, onEdit, onDelete }: ExpenseCardProps) {
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

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "Food":
        return "🍔";
      case "Travel":
        return "✈️";
      case "Rent":
        return "🏠";
      case "Shopping":
        return "🛍️";
      case "Utilities":
        return "⚡";
      case "Entertainment":
        return "🎬";
      default:
        return "📦";
    }
  };

  return (
    <Card className="border-border/30 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 relative overflow-hidden group">
      <CardContent className="p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded font-medium">
                {getCategoryEmoji(expense.category)} {expense.category}
              </span>
              <Badge variant="outline" className="bg-secondary/40 text-muted-foreground text-[10px] px-1.5 py-0">
                Split: {expense.splitType}
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-foreground truncate mt-1">{expense.title}</h4>
            {expense.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-extrabold text-foreground">
              {expense.amount.toFixed(2)} {expense.currency}
            </span>
          </div>
        </div>

        {/* Metadata section */}
        <div className="grid gap-2 sm:grid-cols-3 text-[10px] text-muted-foreground border-t border-border/20 pt-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Paid by: <strong className="text-foreground">{getMemberName(expense.paidBy)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{expense.participants.length} Split Participants</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>{formatDate(expense.createdAt)}</span>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/10 opacity-80 hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
