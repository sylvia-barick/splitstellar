"use client";

import React from "react";
import { Group } from "@/types/group";
import GroupCard from "./GroupCard";

interface GroupGridProps {
  groups: Group[];
  onViewGroup: (id: string) => void;
  onEditGroup: (group: Group) => void;
  onArchiveGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

export default function GroupGrid({
  groups,
  onViewGroup,
  onEditGroup,
  onArchiveGroup,
  onDeleteGroup,
}: GroupGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onView={() => onViewGroup(group.id)}
          onEdit={() => onEditGroup(group)}
          onArchive={() => onArchiveGroup(group)}
          onDelete={() => onDeleteGroup(group)}
        />
      ))}
    </div>
  );
}
