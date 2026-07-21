"use client";

import { useRequestStore } from "@/stores/requestStore";
import { useState, useEffect } from "react";

export function useMoneyRequests() {
  const store = useRequestStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const requests = isMounted ? store.requests : [];

  return {
    ...store,
    requests,
    isHydrated: isMounted,
  };
}
