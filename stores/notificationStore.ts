import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppNotification } from "@/lib/db";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  syncNotifications: (walletAddress?: string) => Promise<void>;
  addNotification: (walletAddress: string, type: string, title: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (walletAddress: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      syncNotifications: async (walletAddress) => {
        try {
          const params = new URLSearchParams();
          if (walletAddress) params.append("wallet", walletAddress);
          const res = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
          const data = await res.json();
          if (data.success) {
            set({ notifications: data.notifications, unreadCount: data.unreadCount });
          }
        } catch (err) {
          console.error("Failed to sync notifications:", err);
        }
      },

      addNotification: async (walletAddress, type, title, message, metadata) => {
        try {
          const res = await fetch(`/api/notifications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, type, title, message, metadata }),
          });
          const data = await res.json();
          if (data.success && data.notification) {
            set((state) => {
              const updated = [data.notification, ...state.notifications.filter((n) => n.id !== data.notification.id)];
              return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.read).length,
              };
            });
          }
        } catch (err) {
          console.error("Failed to add notification:", err);
        }
      },

      markAsRead: async (id) => {
        try {
          await fetch(`/api/notifications`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });

          set((state) => {
            const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
            return {
              notifications: updated,
              unreadCount: updated.filter((n) => !n.read).length,
            };
          });
        } catch (err) {
          console.error("Failed to mark notification as read:", err);
        }
      },

      markAllAsRead: async (walletAddress) => {
        try {
          await fetch(`/api/notifications`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAllRead: true, walletAddress }),
          });

          set((state) => {
            const updated = state.notifications.map((n) => ({ ...n, read: true }));
            return {
              notifications: updated,
              unreadCount: 0,
            };
          });
        } catch (err) {
          console.error("Failed to mark all notifications as read:", err);
        }
      },
    }),
    {
      name: "splitstellar-notification-store",
    }
  )
);
