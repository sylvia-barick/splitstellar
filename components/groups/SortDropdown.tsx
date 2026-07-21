"use client";

import React from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortOption = "Newest" | "Oldest" | "Most Members" | "Alphabetical";

interface SortDropdownProps {
  activeSort: SortOption;
  onChange: (sort: SortOption) => void;
}

export default function SortDropdown({ activeSort, onChange }: SortDropdownProps) {
  const options: SortOption[] = ["Newest", "Oldest", "Most Members", "Alphabetical"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="outline"
          className="border-border/40 bg-card/40 hover:bg-secondary/40 text-xs rounded-xl flex items-center space-x-1.5 h-9"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Sort: {activeSort}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-48 bg-card border-border/80">
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onChange(option)}
            className="text-xs cursor-pointer focus:bg-secondary/40 py-2"
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
