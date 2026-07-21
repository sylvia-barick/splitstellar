"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { Debt } from "@/types/debt";
import { Member } from "@/types/member";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DebtTableProps {
  debts: Debt[];
  members: Member[];
}

export default function DebtTable({ debts, members }: DebtTableProps) {
  const getMemberName = (walletAddress: string) => {
    const member = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return member ? member.name : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-card/25 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300">
      <Table>
        <TableHeader className="bg-secondary/20">
          <TableRow className="border-border/30">
            <TableHead className="text-xs font-semibold text-muted-foreground">From (Debtor)</TableHead>
            <TableHead className="text-center text-xs font-semibold text-muted-foreground"></TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">To (Creditor)</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Amount</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Currency</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <TableRow key={debt.id} className="border-border/20 hover:bg-secondary/10">
              <TableCell className="text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span>{getMemberName(debt.from)}</span>
                </div>
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5 text-primary inline-block" />
              </TableCell>
              <TableCell className="text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span>{getMemberName(debt.to)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right text-xs font-extrabold text-foreground">
                {debt.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-right text-xs font-mono text-muted-foreground">
                {debt.currency}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={
                    debt.status === "Ready"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                  }
                >
                  {debt.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
