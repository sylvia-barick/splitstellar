"use client";

import React, { useState } from "react";
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

interface DeleteGroupDialogProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteGroupDialog({ group, isOpen, onClose, onSuccess }: DeleteGroupDialogProps) {
  const { deleteGroup } = useGroups();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!group || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteGroup(group.id);
      toast.success("Group Deleted", {
        description: `Successfully deleted group "${group.name}".`,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to delete group:", err);
      toast.error("Failed to delete group", {
        description: err instanceof Error ? err.message : "An unexpected error occurred while deleting group.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card border-border/80 text-foreground rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-destructive">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This action will permanently delete the group <strong>&ldquo;{group?.name}&rdquo;</strong> and all its members. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border/20 pt-4">
          <AlertDialogCancel onClick={onClose} disabled={isDeleting} className="border-border/60 hover:bg-secondary/40 rounded-xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-white font-semibold rounded-xl"
          >
            {isDeleting ? "Deleting..." : "Delete Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
