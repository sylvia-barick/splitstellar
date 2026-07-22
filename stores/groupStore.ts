import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Group, SupportedCurrency } from "@/types/group";
import { Member } from "@/types/member";
import { groupRepository } from "@/services/groupRepository";
import { notifySyncChannel } from "@/hooks/useServerSync";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { errorMonitor } from "@/lib/sentry";

interface GroupState {
  groups: Group[];
  syncWithServer: (address?: string) => Promise<void>;
  createGroup: (
    name: string,
    description: string,
    currency: SupportedCurrency,
    ownerWallet: string,
    ownerName: string,
    initialMembers?: Array<{ name: string; walletAddress: string; email?: string }>
  ) => Promise<Group>;
  updateGroup: (id: string, groupData: Partial<Omit<Group, "id" | "createdAt" | "members">>) => void;
  deleteGroup: (id: string) => Promise<void>;
  archiveGroup: (id: string) => void;
  restoreGroup: (id: string) => void;
  addMember: (
    groupId: string,
    name: string,
    walletAddress: string,
    email?: string
  ) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  updateMember: (groupId: string, memberId: string, memberData: Partial<Member>) => void;
  getGroup: (id: string) => Group | undefined;
  getGroups: () => Group[];
  searchGroups: (query: string) => Group[];
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],

      syncWithServer: async (address) => {
        try {
          const fetchedGroups = await groupRepository.fetchGroups(address);
          // Always trust the server response.
          // The API is the single source of truth — if it returns an empty array
          // for this address, that means there are genuinely no groups for this user.
          // Never keep stale local state that can contain deleted groups.
          set({ groups: fetchedGroups });
        } catch (err) {
          console.error("Failed to sync groups:", err);
          // On network error keep existing state — do not wipe
        }
      },

      createGroup: async (name, description, currency, ownerWallet, ownerName, initialMembers) => {
        try {
          const newGroup = await groupRepository.createGroup(
            name,
            description,
            currency,
            ownerWallet,
            ownerName,
            initialMembers
          );

          set((state) => ({
            groups: [...state.groups.filter((g) => g.id !== newGroup.id), newGroup],
          }));

          // Track group creation in Google Analytics
          trackEvent({
            action: ANALYTICS_EVENTS.CREATE_GROUP,
            category: "group",
            label: `${name} (${currency})`,
          });

          notifySyncChannel();
          return newGroup;
        } catch (err) {
          errorMonitor.captureException(err, "backend", { action: "createGroup", name });
          throw err;
        }
      },

      updateGroup: (id, groupData) => {
        const now = new Date().toISOString();
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...groupData, updatedAt: now } : group
          ),
        }));
        fetch(`/api/groups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, groupData }),
        }).catch(() => {});
        notifySyncChannel();
      },

      deleteGroup: async (id) => {
        try {
          await groupRepository.deleteGroup(id);

          trackEvent({
            action: "delete_group",
            category: "group",
            label: id,
          });
        } catch (err) {
          console.warn("deleteGroup repo notice:", err);
          errorMonitor.captureException(err, "backend", { action: "deleteGroup", id });
        }
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
        }));
        notifySyncChannel();
      },

      archiveGroup: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, status: "Archived", updatedAt: now } : group
          ),
        }));
        notifySyncChannel();
      },

      restoreGroup: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, status: "Active", updatedAt: now } : group
          ),
        }));
        notifySyncChannel();
      },

      addMember: async (groupId, name, walletAddress, email) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (group) {
          const isDuplicate = group.members.some(
            (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
          );
          if (isDuplicate) {
            throw new Error("A member with this Stellar wallet address already exists in this group.");
          }
        }

        const updatedGroup = await groupRepository.addMember(groupId, name, walletAddress, email);

        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
        }));

        notifySyncChannel();
      },

      removeMember: async (groupId, memberId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (group) {
          const memberToRemove = group.members.find((m) => m.id === memberId);
          if (memberToRemove && memberToRemove.role === "Owner") {
            throw new Error("The group owner cannot be removed.");
          }
        }

        const updatedGroup = await groupRepository.removeMember(groupId, memberId);

        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
        }));

        notifySyncChannel();
      },

      updateMember: (groupId, memberId, memberData) => {
        const now = new Date().toISOString();
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: g.members.map((m) =>
                    m.id === memberId ? { ...m, ...memberData } : m
                  ),
                  updatedAt: now,
                }
              : g
          ),
        }));
        notifySyncChannel();
      },

      getGroup: (id) => {
        return get().groups.find((group) => group.id === id);
      },

      getGroups: () => {
        return get().groups;
      },

      searchGroups: (query) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return get().groups;

        return get().groups.filter(
          (group) =>
            group.name.toLowerCase().includes(lowerQuery) ||
            group.currency.toLowerCase().includes(lowerQuery) ||
            group.members.some((member) => member.name.toLowerCase().includes(lowerQuery))
        );
      },
    }),
    {
      name: "splitstellar-group-store",
    }
  )
);
