import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActivityItem, ActivityType } from "@/types/payment";
import { notifySyncChannel } from "@/hooks/useServerSync";

interface ActivityState {
  activities: ActivityItem[];
  syncWithServer: () => Promise<void>;
  addActivity: (
    groupId: string,
    actorAddress: string,
    actorName: string,
    type: ActivityType,
    description: string,
    amount?: number,
    currency?: string
  ) => Promise<void>;
  getGroupActivities: (groupId: string) => ActivityItem[];
  getMemberActivities: (walletAddress: string) => ActivityItem[];
  getAllActivities: () => ActivityItem[];
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],

      syncWithServer: async () => {
        try {
          const res = await fetch(`/api/activity`, { cache: "no-store" });
          const data = await res.json();
          if (data.success) {
            set({ activities: data.activities });
          }
        } catch (err) {
          console.error("Failed to sync activities:", err);
        }
      },

      addActivity: async (groupId, actorAddress, actorName, type, description, amount, currency) => {
        try {
          const res = await fetch(`/api/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId, actorAddress, actorName, type, description, amount, currency }),
          });
          const data = await res.json();

          if (data.success && data.activity) {
            set((state) => ({
              activities: [data.activity, ...state.activities.filter((a) => a.id !== data.activity.id)],
            }));
          }
        } catch (err) {
          console.error("Failed to add activity to server:", err);
        }

        notifySyncChannel();
      },

      getGroupActivities: (groupId) => {
        return get().activities.filter((a) => a.groupId === groupId);
      },

      getMemberActivities: (walletAddress) => {
        const lower = walletAddress.toLowerCase();
        return get().activities.filter((a) => a.actorAddress.toLowerCase() === lower);
      },

      getAllActivities: () => {
        return get().activities;
      },
    }),
    {
      name: "splitstellar-activity-store",
    }
  )
);
