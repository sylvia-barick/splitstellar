"use client";

import { useContext } from "react";
import { WalletContext } from "@/contexts/WalletContext";

/**
 * Custom hook to access SplitStellar wallet context.
 * Provides wallet states (address, connection status, loading states) and functions (connect, disconnect).
 */
export function useWallet() {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  
  return context;
}
