"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search groups, currencies, or members..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 rounded-xl bg-card/40 border-border/40 focus-visible:ring-primary/40 focus-visible:border-primary/60"
      />
    </div>
  );
}
