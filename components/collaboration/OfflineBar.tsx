"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { offlineQueue } from "@/lib/offlineQueue";
import { Button } from "@/components/ui/button";

export default function OfflineBar() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const processed = await offlineQueue.processQueue();
      if (processed > 0) {
        setPendingCount(offlineQueue.getQueue().length);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setPendingCount(offlineQueue.getQueue().length);
    };

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      setPendingCount(offlineQueue.getQueue().length);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-400 px-4 py-2 text-xs flex items-center justify-between animate-in fade-in duration-200">
      <div className="flex items-center space-x-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="font-semibold">
          {isOffline
            ? "Offline Mode Active — Transactions will queue locally and auto-sync when connection restores."
            : `Online — ${pendingCount} pending offline action(s) queued for sync.`}
        </span>
      </div>

      <Button
        onClick={() => offlineQueue.processQueue().then(() => setPendingCount(offlineQueue.getQueue().length))}
        size="sm"
        variant="outline"
        className="border-amber-500/40 text-amber-400 hover:bg-amber-500/20 text-[10px] h-6 px-2 rounded-lg"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        <span>Sync Queue</span>
      </Button>
    </div>
  );
}
