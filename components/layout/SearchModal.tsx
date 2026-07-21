"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Users, DollarSign, ArrowRightLeft, User, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  groups: any[];
  expenses: any[];
  payments: any[];
  requests: any[];
  members: any[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({
    groups: [],
    expenses: [],
    payments: [],
    requests: [],
    members: [],
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ groups: [], expenses: [], payments: [], requests: [], members: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const totalHits =
    results.groups.length +
    results.expenses.length +
    results.payments.length +
    results.requests.length +
    results.members.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-card border-border/80 text-foreground rounded-2xl p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/20 flex flex-row items-center justify-between space-y-0 pb-3">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span>Global Blockchain Search</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search groups, expenses, wallet addresses, transaction hashes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 rounded-xl bg-background/50 border-border/40 text-sm h-10"
              autoFocus
            />
            {loading && <Loader2 className="absolute right-3.5 top-3 h-4 w-4 text-primary animate-spin" />}
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 text-xs">
            {query.trim() && !loading && totalHits === 0 && (
              <div className="py-8 text-center text-muted-foreground italic">
                No matching blockchain records found for &quot;{query}&quot;.
              </div>
            )}

            {/* Groups */}
            {results.groups.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Groups</p>
                {results.groups.map((g) => (
                  <div key={g.id} className="p-2.5 rounded-xl border border-border/30 bg-secondary/15 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-bold text-foreground">{g.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono">{g.members?.length || 0} members</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Expenses */}
            {results.expenses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Expenses</p>
                {results.expenses.map((e) => (
                  <div key={e.id} className="p-2.5 rounded-xl border border-border/30 bg-secondary/15 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-foreground">{e.title}</span>
                    </div>
                    <span className="font-bold text-foreground">{e.amount.toFixed(2)} XLM</span>
                  </div>
                ))}
              </div>
            )}

            {/* Payments & Requests */}
            {(results.payments.length > 0 || results.requests.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Settlements & Requests</p>
                {results.payments.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl border border-border/30 bg-secondary/15 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ArrowRightLeft className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="font-mono text-muted-foreground">Tx: {p.transactionHash ? `${p.transactionHash.slice(0, 8)}...` : p.id}</span>
                    </div>
                    <span className="font-bold text-emerald-400">{p.amount.toFixed(2)} XLM</span>
                  </div>
                ))}
              </div>
            )}

            {/* Members */}
            {results.members.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Members</p>
                {results.members.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-border/30 bg-secondary/15 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="font-semibold text-foreground">{m.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
