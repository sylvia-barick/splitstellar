"use client";

import React from "react";
import { Check } from "lucide-react";
import { Member } from "@/types/member";
import { cn } from "@/lib/utils";

interface ParticipantSelectorProps {
  members: Member[];
  selectedWalletAddresses: string[];
  onChange: (addresses: string[]) => void;
}

export default function ParticipantSelector({
  members,
  selectedWalletAddresses,
  onChange,
}: ParticipantSelectorProps) {
  const toggleParticipant = (walletAddress: string) => {
    const isSelected = selectedWalletAddresses.includes(walletAddress);
    if (isSelected) {
      onChange(selectedWalletAddresses.filter((addr) => addr !== walletAddress));
    } else {
      onChange([...selectedWalletAddresses, walletAddress]);
    }
  };

  const selectAll = () => {
    onChange(members.map((m) => m.walletAddress));
  };

  const deselectAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-muted-foreground uppercase tracking-wider">
          Split Participants *
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-[10px] text-primary hover:underline font-semibold bg-transparent border-0 cursor-pointer"
          >
            Select All
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-[10px] text-muted-foreground hover:underline font-semibold bg-transparent border-0 cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 max-h-[160px] overflow-y-auto pr-1">
        {members.map((member) => {
          const isSelected = selectedWalletAddresses.includes(member.walletAddress);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleParticipant(member.walletAddress)}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-all duration-200",
                isSelected
                  ? "border-primary/40 bg-primary/5 text-foreground shadow-[inset_0_0_8px_rgba(0,210,255,0.02)]"
                  : "border-border/30 bg-background/20 text-muted-foreground hover:border-border/60"
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{member.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono truncate mt-0.5">
                  {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60"
                )}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
