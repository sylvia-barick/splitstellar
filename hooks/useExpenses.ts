"use client";

import { useExpenseStore } from "@/stores/expenseStore";
import { useState, useEffect } from "react";

export function useExpenses() {
  const store = useExpenseStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const expenses = isMounted ? store.expenses : [];

  return {
    ...store,
    expenses,
    isHydrated: isMounted,
  };
}
