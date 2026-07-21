"use client";

import { useEffect } from "react";
import { sorobanEvents } from "@/lib/soroban/events";
import { useGroupStore } from "@/stores/groupStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";

export function useContractEvents(walletAddress?: string) {
  const syncGroups = useGroupStore((s) => s.syncWithServer);
  const syncExpenses = useExpenseStore((s) => s.syncWithServer);
  const syncPayments = usePaymentStore((s) => s.syncWithServer);
  const syncRequests = useRequestStore((s) => s.syncWithServer);
  const syncActivities = useActivityStore((s) => s.syncWithServer);

  useEffect(() => {
    const unsubscribe = sorobanEvents.subscribe(() => {
      syncGroups(walletAddress);
      syncExpenses();
      syncPayments();
      syncRequests();
      syncActivities();
    });

    return () => {
      unsubscribe();
    };
  }, [walletAddress, syncGroups, syncExpenses, syncPayments, syncRequests, syncActivities]);
}
