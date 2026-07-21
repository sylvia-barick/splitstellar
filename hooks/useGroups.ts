"use client";

import { useGroupStore } from "@/stores/groupStore";
import { useState, useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";

/**
 * Custom hook to safely interact with the SplitStellar Group Store.
 * Prevents Next.js SSR hydration mismatches by returning empty groups list
 * until the store state has rehydrated in the client's browser.
 * Also waits for wallet initialization to complete before rendering groups
 * to prevent the flash of empty content.
 */
export function useGroups() {
  const store = useGroupStore();
  const { isLoading: isWalletLoading } = useWalletContext();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return empty list during SSR / initial hydration phase OR while wallet is still loading
  const isHydrated = isMounted && !isWalletLoading;
  const groups = isHydrated ? store.groups : [];

  return {
    ...store,
    groups,
    isHydrated,
  };
}
