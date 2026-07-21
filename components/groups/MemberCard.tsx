"use client";

import React from "react";
import { User, Mail, Calendar, Trash, Wallet } from "lucide-react";
import { Member } from "@/types/member";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MemberCardProps {
  member: Member;
  canRemove: boolean;
  onRemove: () => void;
}

export default function MemberCard({ member, canRemove, onRemove }: MemberCardProps) {
  const isOwner = member.role === "Owner";

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Card className="border-border/30 bg-card/30 backdrop-blur-sm relative overflow-hidden group">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{member.name}</span>
              {isOwner ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono shadow-[0_0_8px_rgba(0,210,255,0.1)]">
                  Owner
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase border border-border/20">
                  Member
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-y-0.5 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Wallet className="h-3 w-3 shrink-0" />
                <span>{formatAddress(member.walletAddress)}</span>
              </span>
              {member.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Joined {formatDate(member.joinedAt)}</span>
              </span>
            </div>
          </div>
        </div>

        {canRemove && !isOwner && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-destructive hover:bg-destructive/20 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            title="Remove Member"
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
