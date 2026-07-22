import { Group, SupportedCurrency } from "@/types/group";
import {
  createGroupOnChain,
  joinGroupByInviteCodeOnChain,
  removeMemberOnChain,
  deleteGroupOnChain,
  fetchGroupsForWalletOnChain,
} from "@/lib/soroban/group";

// ─────────────────────────────────────────────────────────────────────────────
// groupRepository — SINGLE SOURCE OF TRUTH: /api/groups (→ lib/db.ts → Supabase)
//
// All CRUD goes through the REST API routes only.
// No direct supabase.from("groups") calls here.
// This guarantees every read and write hits the same db_state blob.
// ─────────────────────────────────────────────────────────────────────────────

export const groupRepository = {
  async fetchGroups(address?: string): Promise<Group[]> {
    // 1. Try Soroban on-chain (only when wallet address is available)
    if (address) {
      try {
        const chainGroups = await fetchGroupsForWalletOnChain(address);
        if (chainGroups.length > 0) return chainGroups;
      } catch {
        // Soroban not available — expected in most cases
      }
    }

    // 2. REST API — the single authoritative source
    try {
      const url = address
        ? `/api/groups?address=${encodeURIComponent(address)}`
        : `/api/groups`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.groups)) {
          return data.groups as Group[];
        }
      }
    } catch (err) {
      console.warn("[groupRepo] API fetch error:", err);
    }

    return [];
  },

  async createGroup(
    name: string,
    description: string,
    currency: SupportedCurrency,
    ownerWallet: string,
    ownerName: string,
    initialMembers?: Array<{ name: string; walletAddress: string; email?: string }>
  ): Promise<Group> {
    // Try Soroban (best-effort, falls through silently)
    let chainGroupId: string | null = null;
    let chainInviteCode: string | null = null;
    try {
      const chainGroup = await createGroupOnChain(name, description, currency, ownerWallet, ownerName);
      chainGroupId = chainGroup.id;
      chainInviteCode = chainGroup.inviteCode ?? null;
    } catch {
      // Expected — Soroban not available
    }

    // Build a stable ID and invite code
    const groupId = chainGroupId || `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const inviteCode = chainInviteCode || `SPLIT-${groupId.slice(-6).toUpperCase()}`;

    // Persist via REST API (→ lib/db.ts → Supabase db_state blob)
    const res = await fetch(`/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: groupId,
        name,
        description,
        currency,
        ownerWallet,
        ownerName,
        inviteCode,
        initialMembers,
      }),
    });

    const data = await res.json();
    if (!data.success || !data.group) {
      throw new Error(data.error || "Failed to create group");
    }

    return data.group as Group;
  },

  async joinGroupByInviteCode(inviteCode: string, userWallet: string): Promise<Group> {
    const cleanCode = inviteCode.toUpperCase().trim();

    try {
      await joinGroupByInviteCodeOnChain(cleanCode, userWallet);
    } catch {
      // Expected — Soroban not available
    }

    // Find the group in the authoritative store
    const allGroups = await groupRepository.fetchGroups();
    const found = allGroups.find((g) => (g.inviteCode || "").toUpperCase() === cleanCode);

    if (!found) {
      throw new Error(`No group found matching invite code ${cleanCode}.`);
    }

    const isMember = found.members.some(
      (m) => m.walletAddress.toLowerCase() === userWallet.toLowerCase()
    );
    if (isMember) return found;

    const userName = `Member (${userWallet.slice(0, 4)}...${userWallet.slice(-4)})`;
    return groupRepository.addMember(found.id, userName, userWallet);
  },

  async addMember(
    groupId: string,
    name: string,
    walletAddress: string,
    email?: string
  ): Promise<Group> {
    try {
      await joinGroupByInviteCodeOnChain(
        `SPLIT-${groupId.slice(-6).toUpperCase()}`,
        walletAddress,
        name
      );
    } catch {
      // Expected
    }

    const res = await fetch(`/api/groups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, action: "addMember", memberName: name, walletAddress, email }),
    });
    const data = await res.json();
    if (!data.success || !data.group) {
      throw new Error(data.error || "Failed to add member");
    }
    return data.group as Group;
  },

  async removeMember(groupId: string, memberId: string): Promise<Group> {
    try {
      await removeMemberOnChain(groupId, memberId);
    } catch {
      // Expected
    }

    const res = await fetch(`/api/groups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: groupId, action: "removeMember", memberId }),
    });
    const data = await res.json();
    if (!data.success || !data.group) {
      throw new Error(data.error || "Failed to remove member");
    }
    return data.group as Group;
  },

  async deleteGroup(groupId: string): Promise<void> {
    try {
      await deleteGroupOnChain(groupId);
    } catch {
      // Expected
    }

    const res = await fetch(`/api/groups?id=${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete group");
    }
  },
};
