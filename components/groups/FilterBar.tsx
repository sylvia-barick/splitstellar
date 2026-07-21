"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type FilterStatus = "All" | "Active" | "Archived";

interface FilterBarProps {
  activeFilter: FilterStatus;
  onChange: (filter: FilterStatus) => void;
}

export default function FilterBar({ activeFilter, onChange }: FilterBarProps) {
  const options: FilterStatus[] = ["All", "Active", "Archived"];

  return (
    <div className="flex rounded-xl bg-secondary/20 p-1 border border-border/40 shrink-0">
      {options.map((option) => {
        const isActive = activeFilter === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
              isActive
                ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 text-primary shadow-[inset_0_0_8px_rgba(0,210,255,0.05)] border border-primary/20"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
