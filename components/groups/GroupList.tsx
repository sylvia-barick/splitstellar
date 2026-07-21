import React, { useMemo } from "react";
import { Users, Trash2, Archive, FolderOpen, Eye, Edit } from "lucide-react";
import { Group } from "@/types/group";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";

interface GroupListProps {
  groups: Group[];
  onViewGroup: (id: string) => void;
  onEditGroup: (group: Group) => void;
  onArchiveGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

function GroupListItem({
  group,
  onViewGroup,
  onEditGroup,
  onArchiveGroup,
  onDeleteGroup,
}: {
  group: Group;
  onViewGroup: (id: string) => void;
  onEditGroup: (group: Group) => void;
  onArchiveGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}) {
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
    <Card className="border-border/40 bg-card/45 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 relative overflow-hidden">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground truncate">{group.name}</h3>
              <span className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-1.5 py-0.5 rounded">
                {group.currency}
              </span>
              <Badge
                variant="outline"
                className={
                  isArchived
                    ? "bg-secondary text-muted-foreground border-border text-[9px] px-1.5 py-0"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0"
                }
              >
                {group.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {group.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground sm:border-l border-border/20 sm:pl-4">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Owner</span>
              <span className="font-mono text-foreground">{formatAddress(group.ownerWallet)}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Members</span>
              <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3 text-indigo-400" /> {group.members.length}
              </span>
            </div>
            <div className="hidden lg:block">
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/60">Created</span>
              <span className="text-foreground">{formatDate(group.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-0 border-border/10 pt-3 md:pt-0 shrink-0">
          <div className="flex items-center gap-4 text-xs text-right md:mr-4">
            <div>
              <span className="block text-[9px] uppercase font-semibold text-muted-foreground">Total Spends</span>
              <span className="font-bold text-foreground">
                {totalExpenses % 1 === 0 ? totalExpenses.toFixed(0) : totalExpenses.toFixed(2)} {group.currency}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-semibold text-muted-foreground">Pending</span>
              <span className="font-bold text-foreground">
                {pendingBalance % 1 === 0 ? pendingBalance.toFixed(0) : pendingBalance.toFixed(2)} {group.currency}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => onViewGroup(group.id)}
              size="sm"
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs h-8 px-2.5 rounded-lg"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              <span>View</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditGroup(group)}
              className="h-8 w-8 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onArchiveGroup(group)}
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
              onClick={() => onDeleteGroup(group)}
              className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GroupList({
  groups,
  onViewGroup,
  onEditGroup,
  onArchiveGroup,
  onDeleteGroup,
}: GroupListProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {groups.map((group) => (
        <GroupListItem
          key={group.id}
          group={group}
          onViewGroup={onViewGroup}
          onEditGroup={onEditGroup}
          onArchiveGroup={onArchiveGroup}
          onDeleteGroup={onDeleteGroup}
        />
      ))}
    </div>
  );
}
