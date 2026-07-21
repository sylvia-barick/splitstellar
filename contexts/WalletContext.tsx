"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { walletService } from "@/services/wallet";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { errorMonitor } from "@/lib/sentry";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  network: string | null;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Sync user with Supabase users table
  const syncUserIdentity = async (userAddress: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from("users").upsert(
        {
          wallet_address: userAddress,
          name: `User ${userAddress.slice(0, 4)}...${userAddress.slice(-4)}`,
        },
        { onConflict: "wallet_address" }
      );
    } catch (err) {
      console.warn("Could not sync user identity with Supabase:", err);
    }
  };

  useEffect(() => {
    const initWallet = async () => {
      const installed = await walletService.isInstalled();
      setIsInstalled(installed);

      if (installed) {
        const addr = await walletService.getAddress();
        if (addr) {
          setAddress(addr);
          setIsConnected(true);
          const net = await walletService.getNetwork();
          setNetwork(net);
          await syncUserIdentity(addr);
        }
      }
    };

    initWallet();
  }, []);

  const connect = async () => {
    try {
      const addr = await walletService.connect();
      if (addr) {
        setAddress(addr);
        setIsConnected(true);
        const net = await walletService.getNetwork();
        setNetwork(net);
        await syncUserIdentity(addr);

        // Track wallet connection in Google Analytics
        trackEvent({
          action: ANALYTICS_EVENTS.CONNECT_WALLET,
          category: "wallet",
          label: addr,
        });
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      errorMonitor.captureException(error, "wallet", { action: "connect" });
      throw error;
    }
  };

  const disconnect = () => {
    walletService.disconnect();
    setIsConnected(false);
    setAddress(null);
    setNetwork(null);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        network,
        isInstalled,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
