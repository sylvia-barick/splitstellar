"use client";

import React from "react";
import { Member } from "@/types/member";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface BalanceTableProps {
  members: Member[];
  balances: Record<
    string,
    {
      totalPaid: number;
      totalOwes: number;
      netBalance: number;
    }
  >;
  currency: string;
}

export default function BalanceTable({ members, balances, currency }: BalanceTableProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card/25 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300">
      <Table>
        <TableHeader className="bg-secondary/15">
          <TableRow className="border-border/30">
            <TableHead className="text-xs font-semibold text-muted-foreground">Member</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Stellar Address</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Total Paid</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Total Owes</TableHead>
            <TableHead className="text-right text-xs font-semibold text-muted-foreground">Net Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const addrKey = member.walletAddress.toLowerCase();
            const bal = balances[addrKey] || { totalPaid: 0, totalOwes: 0, netBalance: 0 };
            const isOwed = bal.netBalance > 0.01;
            const isOwing = bal.netBalance < -0.01;

            return (
              <TableRow key={member.id} className="border-border/20 hover:bg-secondary/10">
                <TableCell className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{member.name}</span>
                    {member.role === "Owner" && (
                      <span className="rounded bg-primary/10 text-primary border border-primary/20 px-1 py-0 text-[8px] font-bold uppercase font-mono">
                        Owner
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground" title={member.walletAddress}>
                  {formatAddress(member.walletAddress)}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-foreground">
                  {bal.totalPaid.toFixed(2)} {currency}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                  {bal.totalOwes.toFixed(2)} {currency}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right text-xs font-black",
                    isOwed
                      ? "text-emerald-400"
                      : isOwing
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {isOwed ? "+" : ""}
                  {bal.netBalance.toFixed(2)} {currency}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
