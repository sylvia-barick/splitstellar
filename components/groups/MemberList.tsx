"use client";

import React from "react";
import { Member } from "@/types/member";
import MemberCard from "./MemberCard";

interface MemberListProps {
  members: Member[];
  onRemoveMember?: (memberId: string) => void;
  canManage: boolean;
}

export default function MemberList({ members, onRemoveMember, canManage }: MemberListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          canRemove={canManage && member.role !== "Owner"}
          onRemove={() => onRemoveMember && onRemoveMember(member.id)}
        />
      ))}
    </div>
  );
}
