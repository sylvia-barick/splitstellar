"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { Group } from "@/types/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const editGroupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be under 50 characters"),
  description: z.string().max(300, "Description must be under 300 characters").optional().or(z.literal("")),
  currency: z.enum(["USD", "INR", "EUR", "GBP", "XLM"], {
    message: "Currency is required",
  }),
});

type EditGroupFormValues = z.infer<typeof editGroupSchema>;

interface EditGroupDialogProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditGroupDialog({ group, isOpen, onClose }: EditGroupDialogProps) {
  const { updateGroup } = useGroups();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "XLM",
    },
  });

  // Pre-populate fields when group changes or opens
  useEffect(() => {
    if (group) {
      reset({
        name: group.name,
        description: group.description,
        currency: group.currency,
      });
    }
  }, [group, reset]);

  const onSubmit = (values: EditGroupFormValues) => {
    if (!group) return;

    updateGroup(group.id, {
      name: values.name,
      description: values.description || "",
      currency: values.currency,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/80 text-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            <span>Edit Group Details</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update your group&apos;s details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group Name */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Berlin Roommates"
              className="rounded-xl bg-background/30 border-border/40"
              {...register("name")}
            />
            {errors.name && (
              <span className="text-[10px] text-destructive font-medium">{errors.name.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <textarea
              placeholder="e.g. Shared expenses for Apartment 4B bills"
              rows={3}
              className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/60 resize-none"
              {...register("description")}
            />
            {errors.description && (
              <span className="text-[10px] text-destructive font-medium">
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Currency */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Base Currency *
            </label>
            <select
              className="flex h-9 w-full rounded-xl border border-border/40 bg-background/30 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              {...register("currency")}
            >
              <option value="XLM">XLM (Stellar Lumens)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
            {errors.currency && (
              <span className="text-[10px] text-destructive font-medium">
                {errors.currency.message}
              </span>
            )}
          </div>

          <DialogFooter className="border-t border-border/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/60 hover:bg-secondary/40 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-5"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
