"use client";

import React from "react";
import { useGroups } from "@/hooks/useGroups";
import { Group } from "@/types/group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ArchiveDialogProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ArchiveDialog({ group, isOpen, onClose }: ArchiveDialogProps) {
  const { archiveGroup, restoreGroup } = useGroups();

  if (!group) return null;

  const isArchived = group.status === "Archived";

  const handleAction = () => {
    if (isArchived) {
      restoreGroup(group.id);
      toast.success("Group Restored", {
        description: `Successfully restored group "${group.name}".`,
      });
    } else {
      archiveGroup(group.id);
      toast.success("Group Archived", {
        description: `Successfully archived group "${group.name}".`,
      });
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card border-border/80 text-foreground rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">
            {isArchived ? "Restore Group?" : "Archive Group?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {isArchived
              ? `This will restore "${group.name}" back to your active groups directory. Members will be able to perform actions again.`
              : `This will move "${group.name}" to the archived folder. You can still view it, but no active expense splits can be recorded.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border/20 pt-4">
          <AlertDialogCancel onClick={onClose} className="border-border/60 hover:bg-secondary/40 rounded-xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
          >
            {isArchived ? "Restore Group" : "Archive Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
