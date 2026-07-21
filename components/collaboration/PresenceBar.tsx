"use client";

import React, { useEffect, useState } from "react";
import { Users, Wifi } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Badge } from "@/components/ui/badge";

export default function PresenceBar() {
  const { address: userWallet } = useWallet();
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // Simulate real-time peer count or broadcast channel count
    const channel = typeof window !== "undefined" ? new BroadcastChannel("splitstellar-presence") : null;
    if (channel) {
      channel.postMessage({ type: "ping", wallet: userWallet });
      channel.onmessage = () => {
        setOnlineCount((prev) => Math.min(prev + 1, 8));
      };
    }

    return () => {
      if (channel) channel.close();
    };
  }, [userWallet]);

  return (
    <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full border border-border/30">
      <div className="flex items-center space-x-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-foreground text-[11px]">Real-Time Network Sync</span>
      </div>
      <span className="text-border">|</span>
      <div className="flex items-center space-x-1 text-[10px] font-mono">
        <Users className="h-3 w-3 text-primary" />
        <span>{onlineCount} active peer{onlineCount > 1 ? "s" : ""} connected</span>
      </div>
    </div>
  );
}
