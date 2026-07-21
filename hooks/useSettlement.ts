"use client";

import { useDebtStore } from "@/stores/debtStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useState, useEffect } from "react";

export function useSettlement() {
  const debtStore = useDebtStore();
  const paymentStore = usePaymentStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const payments = isMounted ? paymentStore.payments : [];

  return {
    ...debtStore,
    payments,
    createPayment: paymentStore.createPayment,
    markAsPaid: paymentStore.markAsPaid,
    confirmReceipt: paymentStore.confirmReceipt,
    getPaymentsByGroup: paymentStore.getPaymentsByGroup,
    getPaymentsByMember: paymentStore.getPaymentsByMember,
    isHydrated: isMounted,
  };
}
