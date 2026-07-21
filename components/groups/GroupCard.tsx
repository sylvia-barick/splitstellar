"use client";

import React, { useMemo } from "react";
import { Users, Calendar, Shield, Trash2, Archive, FolderOpen, Eye, Edit } from "lucide-react";
import { Group } from "@/types/group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";

interface GroupCardProps {
  group: Group;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export default function GroupCard({ group, onView, onEdit, onArchive, onDelete }: GroupCardProps) {
  const expenses = useExpenseStore((state) => state.expenses);
  const calculateBalances = useExpenseStore((state) => state.calculateBalances);
  const payments = usePaymentStore((state) => state.payments);
  const requests = useRequestStore((state) => state.requests);

  const { totalExpenses, pendingBalance } = useMemo(() => {
    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    const totalExp = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

    const memberAddrs = group.members.map((m) => m.walletAddress);
    const balanceMap = calculateBalances(group.id, memberAddrs);

    let pending = 0;
    Object.values(balanceMap).forEach((b) => {
      if (b.netBalance > 0.01) {
        pending += b.netBalance;
      }
    });

    return {
      totalExpenses: totalExp,
      pendingBalance: pending,
    };
  }, [group.id, group.members, expenses, payments, requests, calculateBalances]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const isArchived = group.status === "Archived";

  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,210,255,0.05)] group flex flex-col h-full justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono bg-secondary/60 px-2 py-0.5 rounded border border-border/20">
              Currency: {group.currency}
            </span>
            <Badge
              variant="outline"
              className={
                isArchived
                  ? "bg-secondary text-muted-foreground border-border"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }
            >
              {group.status}
            </Badge>
          </div>
          <CardTitle className="text-base font-bold group-hover:text-primary transition-colors mt-3 truncate">
            {group.name}
          </CardTitle>
          <CardDescription className="text-xs line-clamp-2 min-h-[32px] mt-1">
            {group.description || "No description provided."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Metadata */}
          <div className="space-y-2 text-xs text-muted-foreground border-t border-border/25 pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>Owner:</span>
              </span>
              <span className="font-mono text-foreground">{formatAddress(group.ownerWallet)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>Created:</span>
              </span>
              <span className="text-foreground">{formatDate(group.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <span>Members:</span>
              </span>
              <span className="text-foreground font-semibold">{group.members.length}</span>
            </div>
          </div>

          {/* Spends Overview */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/25 pt-3 text-center text-xs">
            <div className="rounded-lg bg-secondary/15 p-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Expenses
              </p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {totalExpenses % 1 === 0 ? totalExpenses.toFixed(0) : totalExpenses.toFixed(2)} {group.currency}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/15 p-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Balance
              </p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {pendingBalance % 1 === 0 ? pendingBalance.toFixed(0) : pendingBalance.toFixed(2)} {group.currency}
              </p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border/20 bg-secondary/10 mt-2 shrink-0">
        <Button
          onClick={onView}
          size="sm"
          className="bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20 text-xs px-3 rounded-lg"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          <span>View</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            title="Edit Group"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onArchive}
            className="h-8 w-8 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            title={isArchived ? "Restore Group" : "Archive Group"}
          >
            {isArchived ? (
              <FolderOpen className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Delete Group"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
