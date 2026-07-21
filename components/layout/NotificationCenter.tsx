"use client";

import React, { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, ShieldCheck, Clock } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useNotificationStore } from "@/stores/notificationStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationCenter() {
  const { address: userWallet } = useWallet();
  const { notifications, unreadCount, syncNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    syncNotifications(userWallet || undefined);
    const interval = setInterval(() => {
      syncNotifications(userWallet || undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [userWallet, syncNotifications]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl border border-border/40 bg-secondary/20"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {unreadCount} new
                  </Badge>
                )}
              </div>

              {unreadCount > 0 && (
                <Button
                  onClick={() => markAllAsRead(userWallet || "")}
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark all read</span>
                </Button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground italic">
                  No notifications recorded yet.
                </div>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1 ${
                      n.read
                        ? "border-border/20 bg-secondary/10 opacity-70"
                        : "border-primary/30 bg-primary/5 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{n.title}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
