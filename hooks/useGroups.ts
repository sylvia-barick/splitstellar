"use client";

import { useGroupStore } from "@/stores/groupStore";
import { useState, useEffect } from "react";

/**
 * Custom hook to safely interact with the SplitStellar Group Store.
 * Prevents Next.js SSR hydration mismatches by returning empty groups list
 * until the store state has rehydrated in the client's browser.
 */
export function useGroups() {
  const store = useGroupStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Return empty list during SSR / initial hydration phase
  const groups = isMounted ? store.groups : [];

  return {
    ...store,
    groups,
    isHydrated: isMounted,
  };
}
