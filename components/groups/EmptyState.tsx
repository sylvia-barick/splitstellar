"use client";

import React from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border/60 rounded-2xl p-12 text-center bg-card/20 backdrop-blur-sm max-w-lg mx-auto mt-12 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
        <Users className="h-8 w-8" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground font-mono shadow-[0_0_8px_#00d2ff]">
          0
        </span>
      </div>
      
      <h3 className="text-lg font-bold tracking-tight text-foreground">
        No groups yet
      </h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
        Get started by creating a new expense splitting group, invite members with their Stellar addresses, and manage shared bills on-chain.
      </p>

      <Button
        onClick={onCreateClick}
        className="mt-6 bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl shadow-[0_0_15px_rgba(0,210,255,0.2)] flex items-center space-x-2"
      >
        <Plus className="h-4 w-4" />
        <span>Create Group</span>
      </Button>
    </div>
  );
}
