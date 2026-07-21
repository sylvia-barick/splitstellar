"use client";

import { useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { useGroupStore } from "@/stores/groupStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useRealtimeSync() {
  const { address } = useWallet();

  const syncAllData = useCallback(async () => {
    try {
      await Promise.all([
        useGroupStore.getState().syncWithServer(address || undefined),
        useExpenseStore.getState().syncWithServer(),
        usePaymentStore.getState().syncWithServer(),
        useRequestStore.getState().syncWithServer(),
        useActivityStore.getState().syncWithServer(),
      ]);
    } catch (err) {
      console.error("Realtime sync error:", err);
    }
  }, [address]);

  useEffect(() => {
    // Initial sync
    syncAllData();

    // 1. Setup Supabase Realtime Postgres Subscriptions
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel("splitstellar-realtime")
          .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => syncAllData())
          .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => syncAllData())
          .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => syncAllData())
          .on("postgres_changes", { event: "*", schema: "public", table: "expense_participants" }, () => syncAllData())
          .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => syncAllData())
          .on("postgres_changes", { event: "*", schema: "public", table: "settlements" }, () => syncAllData())
          .subscribe();
      } catch (err) {
        console.warn("Supabase Realtime subscription error:", err);
      }
    }

    // 2. Setup 3s Polling Interval for live updates across all instances
    const intervalId = setInterval(() => {
      syncAllData();
    }, 3000);

    // 3. BroadcastChannel listener for instant cross-tab sync
    let broadcast: BroadcastChannel | null = null;
    if (typeof window !== "undefined") {
      try {
        broadcast = new BroadcastChannel("splitstellar-sync");
        broadcast.onmessage = () => {
          syncAllData();
        };
      } catch (err) {
        console.warn("BroadcastChannel error:", err);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (broadcast) broadcast.close();
      if (channel && isSupabaseConfigured) {
        supabase.removeChannel(channel);
      }
    };
  }, [syncAllData]);

  return { syncAllData };
}
