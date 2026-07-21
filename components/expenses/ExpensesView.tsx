"use client";

import React, { useState } from "react";
import { Receipt, Plus, Search, Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses } from "@/hooks/useExpenses";
import { useGroups } from "@/hooks/useGroups";
import { useWalletContext } from "@/contexts/WalletContext";
import CreateExpenseDialog from "./CreateExpenseDialog";

export default function ExpensesView() {
  const { expenses } = useExpenses();
  const { groups } = useGroups();
  const { address } = useWalletContext();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredExpenses = expenses.filter((exp) => {
    const q = search.toLowerCase();
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      exp.paidBy.toLowerCase().includes(q)
    );
  });

  const getGroupName = (gid: string) => {
    const group = groups.find((g) => g.id === gid);
    return group ? group.name : "Group";
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Group Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Audit and record shared bills across your active Stellar networks.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(0,210,255,0.15)] flex items-center space-x-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Filtering Options */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses, groups, or payers..."
            className="pl-10 rounded-xl bg-card/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/60"
          />
        </div>
      </div>

      {/* Expenses Ledger */}
      {filteredExpenses.length === 0 ? (
        <Card className="border-border/30 bg-card/30 backdrop-blur-sm p-8 text-center text-muted-foreground rounded-2xl">
          <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">No Soroban smart contract expenses found.</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Create a group expense to record on Stellar Testnet.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => {
            const isPayerYou =
              address && exp.paidBy.toLowerCase() === address.toLowerCase();

            return (
              <Card
                key={exp.id}
                className="border-border/30 bg-card/30 backdrop-blur-sm hover:bg-secondary/20 hover:border-primary/20 transition-all duration-200"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold leading-none text-foreground truncate">
                        {exp.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-foreground font-medium">
                          {getGroupName(exp.groupId)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <User className="h-3 w-3" /> Paid by{" "}
                          {isPayerYou
                            ? "You"
                            : `${exp.paidBy.slice(0, 4)}...${exp.paidBy.slice(-4)}`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />{" "}
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-0 border-border/10 pt-3 sm:pt-0 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                        Total Expense
                      </p>
                      <p className="text-sm font-bold text-foreground text-right">
                        {exp.amount} {exp.currency}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <CreateExpenseDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          group={groups[0]}
        />
      )}
    </div>
  );
}
