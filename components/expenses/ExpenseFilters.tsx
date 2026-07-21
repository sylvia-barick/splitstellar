"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ExpenseCategory } from "@/types/expense";

interface ExpenseFiltersProps {
  activeCategory: ExpenseCategory | "All";
  onChange: (category: ExpenseCategory | "All") => void;
}

export default function ExpenseFilters({ activeCategory, onChange }: ExpenseFiltersProps) {
  const categories: (ExpenseCategory | "All")[] = [
    "All",
    "Food",
    "Travel",
    "Rent",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Others",
  ];

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border/20 pb-4">
      {categories.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer border",
              isActive
                ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 text-primary border-primary/30 shadow-[inset_0_0_8px_rgba(0,210,255,0.05)]"
                : "bg-card/30 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
