"use client";

import { useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { useGroupStore } from "@/stores/groupStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useRequestStore } from "@/stores/requestStore";
import { useActivityStore } from "@/stores/activityStore";

export function notifySyncChannel() {
  if (typeof window !== "undefined") {
    try {
      const channel = new BroadcastChannel("splitstellar-sync");
      channel.postMessage({ type: "SYNC_EVENT", timestamp: Date.now() });
      channel.close();
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }
  }
}

export function useServerSync() {
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
      console.error("Server sync error:", err);
    }
  }, [address]);

  useEffect(() => {
    // Initial sync on mount or address change
    syncAllData();

    // 1. Setup Polling Interval (every 3 seconds) for live multi-browser updates
    const intervalId = setInterval(() => {
      syncAllData();
    }, 3000);

    // 2. Setup BroadcastChannel listener for instant cross-tab sync
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined") {
      try {
        channel = new BroadcastChannel("splitstellar-sync");
        channel.onmessage = () => {
          syncAllData();
        };
      } catch (err) {
        console.warn("BroadcastChannel not supported:", err);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (channel) channel.close();
    };
  }, [syncAllData]);

  return { syncAllData };
}
