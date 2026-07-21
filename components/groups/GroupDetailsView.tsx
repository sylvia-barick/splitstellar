"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  UserPlus,
  Shield,
  Calendar,
  Coins,
  ArrowUpDown,
  ChevronDown,
  Grid,
  List,
  PlusCircle,
  Activity,
  Copy,
} from "lucide-react";
import { Group } from "@/types/group";
import { Expense, ExpenseCategory } from "@/types/expense";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/hooks/useGroups";
import { useExpenseStore } from "@/stores/expenseStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MemberList from "./MemberList";
import InviteMemberDialog from "./InviteMemberDialog";
import CreateExpenseDialog from "@/components/expenses/CreateExpenseDialog";
import EditExpenseDialog from "@/components/expenses/EditExpenseDialog";
import DeleteExpenseDialog from "@/components/expenses/DeleteExpenseDialog";
import ExpenseSummary from "@/components/expenses/ExpenseSummary";
import BalanceTable from "@/components/expenses/BalanceTable";
import BalanceCard from "@/components/expenses/BalanceCard";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseSearch from "@/components/expenses/ExpenseSearch";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseHistory from "@/components/expenses/ExpenseHistory";
import SettlementPlanView from "@/components/debt/SettlementPlan";
import { toast } from "sonner";

interface GroupDetailsViewProps {
  group: Group;
  onBack: () => void;
}

type ExpenseSortOption = "Newest" | "Oldest" | "Highest Amount" | "Lowest Amount";

export default function GroupDetailsView({ group, onBack }: GroupDetailsViewProps) {
  const { removeMember } = useGroups();
  const { address: userWallet, isConnected } = useWallet();

  // Dialog States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isDeleteExpenseOpen, setIsDeleteExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Expense Filtering, Searching & Sorting States
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<ExpenseCategory | "All">("All");
  const [expenseSortOption, setExpenseSortOption] = useState<ExpenseSortOption>("Newest");
  const [isExpenseGridView, setIsExpenseGridView] = useState(false);

  // Fetch expenses and memoize derived calculations to avoid getSnapshot infinite loops
  const expenses = useExpenseStore((state) => state.expenses);
  const calculateBalances = useExpenseStore((state) => state.calculateBalances);
  const getGroupSummary = useExpenseStore((state) => state.getGroupSummary);

  const groupExpenses = useMemo(
    () => expenses.filter((exp) => exp.groupId === group.id),
    [expenses, group.id]
  );

  const memberAddresses = useMemo(
    () => group.members.map((m) => m.walletAddress),
    [group.members]
  );

  const balances = useMemo(
    () => calculateBalances(group.id, memberAddresses),
    [expenses, group.id, memberAddresses, calculateBalances]
  );

  const summary = useMemo(
    () => getGroupSummary(group.id, group.members.length),
    [expenses, group.id, group.members.length, getGroupSummary]
  );

  const userAddr = userWallet?.toLowerCase() || "";
  const userNetBalance = balances[userAddr]?.netBalance || 0;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleRemoveMember = (memberId: string) => {
    try {
      removeMember(group.id, memberId);
      toast.success("Member Removed", {
        description: "Successfully removed member from the group contract.",
      });
    } catch (err) {
      toast.error("Failed to remove member", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };

  const handleOpenDeleteExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteExpenseOpen(true);
  };

  // Process expenses (Filtering, Searching & Sorting)
  const getProcessedExpenses = () => {
    let result = [...groupExpenses];

    // 1. Filter Category
    if (expenseCategoryFilter !== "All") {
      result = result.filter((exp) => exp.category === expenseCategoryFilter);
    }

    // 2. Search Query
    const query = expenseSearchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(
        (exp) =>
          exp.title.toLowerCase().includes(query) ||
          exp.category.toLowerCase().includes(query) ||
          group.members.some(
            (m) =>
              m.walletAddress.toLowerCase() === exp.paidBy.toLowerCase() &&
              m.name.toLowerCase().includes(query)
          )
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (expenseSortOption) {
        case "Newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "Oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "Highest Amount":
          return b.amount - a.amount;
        case "Lowest Amount":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return result;
  };

  const processedExpenses = getProcessedExpenses();
  const isUserOwner = !!(isConnected && userWallet && group.ownerWallet.toLowerCase() === userWallet.toLowerCase());
  const isArchived = group.status === "Archived";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Navigation and Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 self-start h-9"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Groups</span>
        </Button>

        <div className="flex gap-2">
          {!isArchived && (
            <Button
              onClick={() => setIsCreateExpenseOpen(true)}
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(0,210,255,0.15)] flex items-center space-x-2 text-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Expense</span>
            </Button>
          )}

          {!isArchived && (
            <Button
              onClick={() => setIsInviteOpen(true)}
              variant="outline"
              className="border-border/40 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 h-9"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Members</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{group.name}</h2>
            <p className="text-xs text-muted-foreground">
              {group.description || "No description provided for this group."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {group.inviteCode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(group.inviteCode || "");
                  toast.success("Invite Code copied!", {
                    description: `Share code "${group.inviteCode}" for members to join.`,
                  });
                }}
                className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 text-xs font-mono font-bold h-7 rounded-xl flex items-center space-x-1.5"
                title="Click to copy invite code"
              >
                <span>Code: {group.inviteCode}</span>
                <Copy className="h-3 w-3" />
              </Button>
            )}
            <Badge variant="outline" className="bg-secondary/80 text-muted-foreground border-border text-xs py-0.5">
              Base Currency: {group.currency}
            </Badge>
            <Badge
              variant="outline"
              className={
                isArchived
                  ? "bg-secondary text-muted-foreground border-border text-xs py-0.5"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs py-0.5"
              }
            >
              {group.status}
            </Badge>
          </div>
        </div>

        {/* Quick info grid */}
        <div className="grid gap-4 sm:grid-cols-3 border-t border-border/20 pt-4 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-indigo-400" /> Owner Address
            </span>
            <span className="font-mono text-foreground block truncate" title={group.ownerWallet}>
              {group.ownerWallet}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" /> Created Date
            </span>
            <span className="text-foreground block">{formatDate(group.createdAt)}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-indigo-400" /> Contract Status
            </span>
            <span className="text-emerald-400 font-semibold block flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Soroban ready
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="bg-secondary/15 rounded-xl border border-border/40 p-1 flex w-fit">
          <TabsTrigger value="overview" className="rounded-lg text-xs px-4 py-1.5 cursor-pointer">
            Overview
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg text-xs px-4 py-1.5 cursor-pointer">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg text-xs px-4 py-1.5 cursor-pointer">
            Members
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg text-xs px-4 py-1.5 cursor-pointer">
            Activity
          </TabsTrigger>
          <TabsTrigger value="settlement" className="rounded-lg text-xs px-4 py-1.5 cursor-pointer">
            Settlement
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* Summary Cards */}
          <ExpenseSummary summary={summary} currency={group.currency} />

          {/* User balance card */}
          {isConnected && (
            <BalanceCard netBalance={userNetBalance} currency={group.currency} />
          )}

          {/* Balances table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
              Member Balances
            </h3>
            <BalanceTable members={group.members} balances={balances} currency={group.currency} />
          </div>
        </TabsContent>

        {/* Tab 2: Expenses */}
        <TabsContent value="expenses" className="space-y-4 outline-none">
          {/* Expense Controls Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-border/20 pb-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <ExpenseSearch value={expenseSearchQuery} onChange={setExpenseSearchQuery} />
              <ExpenseFilters activeCategory={expenseCategoryFilter} onChange={setExpenseCategoryFilter} />
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button
                    variant="outline"
                    className="border-border/40 bg-card/45 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 h-9"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Sort: {expenseSortOption}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48 bg-card border-border/80 text-xs">
                  <DropdownMenuItem onClick={() => setExpenseSortOption("Newest")} className="cursor-pointer">
                    Newest
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSortOption("Oldest")} className="cursor-pointer">
                    Oldest
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSortOption("Highest Amount")} className="cursor-pointer">
                    Highest Amount
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpenseSortOption("Lowest Amount")} className="cursor-pointer">
                    Lowest Amount
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex border border-border/40 rounded-xl bg-secondary/10 p-1 shrink-0 h-9 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpenseGridView(true)}
                  className={`h-7 w-7 rounded-lg p-0 ${isExpenseGridView ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                  title="Card View"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpenseGridView(false)}
                  className={`h-7 w-7 rounded-lg p-0 ${!isExpenseGridView ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expense display grid / table */}
          {groupExpenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/10 p-12 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 text-muted-foreground mb-1">
                <Activity className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No expenses added yet.</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Add your first expense to begin splitting charges on the smart contract split ledger.
              </p>
              {!isArchived && (
                <Button
                  onClick={() => setIsCreateExpenseOpen(true)}
                  className="bg-primary/20 hover:bg-primary/35 text-primary border border-primary/30 rounded-xl text-xs"
                >
                  Add First Expense
                </Button>
              )}
            </div>
          ) : processedExpenses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-2xl bg-card/15">
              <p className="text-sm font-semibold text-muted-foreground">No expenses match your search query.</p>
              <Button
                variant="link"
                onClick={() => {
                  setExpenseSearchQuery("");
                  setExpenseCategoryFilter("All");
                }}
                className="text-primary text-xs mt-1"
              >
                Clear filters
              </Button>
            </div>
          ) : isExpenseGridView ? (
            <ExpenseList
              expenses={processedExpenses}
              members={group.members}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleOpenDeleteExpense}
            />
          ) : (
            <ExpenseTable
              expenses={processedExpenses}
              members={group.members}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleOpenDeleteExpense}
            />
          )}
        </TabsContent>

        {/* Tab 3: Members */}
        <TabsContent value="members" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
              <span>Members Directory</span>
              <span className="rounded-full bg-secondary/60 border border-border/25 px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                {group.members.length}
              </span>
            </h3>
          </div>
          <MemberList
            members={group.members}
            canManage={!isArchived}
            onRemoveMember={handleRemoveMember}
          />
        </TabsContent>

        {/* Tab 4: Activity */}
        <TabsContent value="activity" className="outline-none">
          <ExpenseHistory expenses={groupExpenses} members={group.members} />
        </TabsContent>

        {/* Tab 5: Settlement */}
        <TabsContent value="settlement" className="outline-none">
          <SettlementPlanView group={group} />
        </TabsContent>
      </Tabs>

      {/* Dialog Modals */}
      <InviteMemberDialog
        group={group}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <CreateExpenseDialog
        group={group}
        isOpen={isCreateExpenseOpen}
        onClose={() => setIsCreateExpenseOpen(false)}
      />

      <EditExpenseDialog
        group={group}
        expense={selectedExpense}
        isOpen={isEditExpenseOpen}
        onClose={() => {
          setIsEditExpenseOpen(false);
          setSelectedExpense(null);
        }}
      />

      <DeleteExpenseDialog
        expense={selectedExpense}
        isOpen={isDeleteExpenseOpen}
        onClose={() => {
          setIsDeleteExpenseOpen(false);
          setSelectedExpense(null);
        }}
      />
    </div>
  );
}
