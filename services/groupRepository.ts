import { Group, SupportedCurrency } from "@/types/group";
import {
  createGroupOnChain,
  joinGroupByInviteCodeOnChain,
  removeMemberOnChain,
  deleteGroupOnChain,
  fetchGroupsForWalletOnChain,
} from "@/lib/soroban/group";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const groupRepository = {
  async fetchGroups(address?: string): Promise<Group[]> {
    if (address) {
      try {
        const chainGroups = await fetchGroupsForWalletOnChain(address);
        if (chainGroups.length > 0) return chainGroups;
      } catch (err) {
        console.warn("On-chain fetchGroups notice:", err);
      }
    }

    if (isSupabaseConfigured && address) {
      try {
        const lower = address.toLowerCase();
        const { data: groupsData } = await supabase
          .from("groups")
          .select("*, group_members(*)");

        if (groupsData) {
          return (groupsData as Array<Record<string, unknown>>)
            .filter((g) => {
              const members = (g.group_members as Array<Record<string, unknown>>) || [];
              const isOwner = String(g.owner_wallet || "").toLowerCase() === lower;
              const isMember = members.some(
                (m) => String(m.wallet_address || "").toLowerCase() === lower
              );
              return isOwner || isMember;
            })
            .map((g) => ({
              id: String(g.id || ""),
              name: String(g.name || ""),
              description: String(g.description || ""),
              currency: (g.currency as SupportedCurrency) || "XLM",
              inviteCode: String(g.invite_code || ""),
              ownerWallet: String(g.owner_wallet || ""),
              createdAt: String(g.created_at || new Date().toISOString()),
              updatedAt: String(g.updated_at || new Date().toISOString()),
              status: g.status === "Archived" ? "Archived" : "Active",
              totalExpenses: 0,
              pendingBalance: 0,
              members: ((g.group_members as Array<Record<string, unknown>>) || []).map((m) => ({
                id: String(m.id || ""),
                name: String(m.name || "Member"),
                walletAddress: String(m.wallet_address || ""),
                email: String(m.email || ""),
                joinedAt: String(m.joined_at || new Date().toISOString()),
                role: m.role === "Owner" ? "Owner" : "Member",
              })),
            }));
        }
      } catch (err) {
        console.warn("Supabase fetchGroups fallback notice:", err);
      }
    }

    if (!isSupabaseConfigured && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("splitstellar-group-store");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.groups) {
            return parsed.state.groups;
          }
        }
      } catch {}
      return [];
    }

    const url = address ? `/api/groups?address=${encodeURIComponent(address)}` : `/api/groups`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data.success ? data.groups : [];
  },

  async createGroup(
    name: string,
    description: string,
    currency: SupportedCurrency,
    ownerWallet: string,
    ownerName: string,
    initialMembers?: Array<{ name: string; walletAddress: string; email?: string }>
  ): Promise<Group> {
    let group: Group;
    try {
      group = await createGroupOnChain(name, description, currency, ownerWallet, ownerName);
    } catch (err) {
      console.warn("Soroban createGroupOnChain notice:", err);
      const groupId = `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();
      group = {
        id: groupId,
        name,
        description: description || "",
        currency,
        inviteCode: `SPLIT-${groupId.slice(-6).toUpperCase()}`,
        ownerWallet,
        createdAt: now,
        updatedAt: now,
        status: "Active",
        totalExpenses: 0,
        pendingBalance: 0,
        members: [
          {
            id: `mem-${Date.now()}-owner`,
            name: ownerName || "Owner",
            walletAddress: ownerWallet,
            joinedAt: now,
            role: "Owner",
          },
        ],
      };
    }

    if (Array.isArray(initialMembers) && initialMembers.length > 0) {
      initialMembers.forEach((m) => {
        if (!group.members.some((existing) => existing.walletAddress.toLowerCase() === m.walletAddress.toLowerCase())) {
          group.members.push({
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: m.name,
            walletAddress: m.walletAddress,
            email: m.email,
            joinedAt: new Date().toISOString(),
            role: "Member",
          });
        }
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from("users").upsert(
          { wallet_address: ownerWallet, name: ownerName },
          { onConflict: "wallet_address" }
        );
        await supabase.from("groups").insert({
          id: group.id,
          name: group.name,
          description: group.description,
          currency: group.currency,
          invite_code: group.inviteCode,
          owner_wallet: ownerWallet,
          status: "Active",
        });
        await supabase.from("group_members").insert({
          group_id: group.id,
          wallet_address: ownerWallet,
          name: ownerName,
          role: "Owner",
        });
      } catch (err) {
        console.warn("Supabase createGroup sync notice:", err);
      }
    }

    try {
      await fetch(`/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: group.id,
          name,
          description,
          currency,
          ownerWallet,
          ownerName,
          inviteCode: group.inviteCode,
          initialMembers,
        }),
      });
    } catch {
      // Local sync fallback
    }

    return group;
  },

  async joinGroupByInviteCode(inviteCode: string, userWallet: string): Promise<Group> {
    const cleanCode = inviteCode.toUpperCase().trim();
    try {
      await joinGroupByInviteCodeOnChain(cleanCode, userWallet);
    } catch (err) {
      console.warn("Soroban joinGroupByInviteCode notice:", err);
    }

    const groups = await groupRepository.fetchGroups(userWallet);
    let joined = groups.find((g) => (g.inviteCode || "").toUpperCase() === cleanCode);

    if (!joined) {
      const allGroups = await groupRepository.fetchGroups();
      joined = allGroups.find((g) => (g.inviteCode || "").toUpperCase() === cleanCode);
    }

    if (joined) {
      const isMem = joined.members.some((m) => m.walletAddress.toLowerCase() === userWallet.toLowerCase());
      if (!isMem) {
        const userName = `Member (${userWallet.slice(0, 4)}...${userWallet.slice(-4)})`;
        joined = await groupRepository.addMember(joined.id, userName, userWallet);
      }
      return joined;
    }

    throw new Error(`No group found matching invite code ${cleanCode}.`);
  },

  async addMember(
    groupId: string,
    name: string,
    walletAddress: string,
    email?: string
  ): Promise<Group> {
    const inviteCode = `SPLIT-${groupId.slice(-6).toUpperCase()}`;
    try {
      await joinGroupByInviteCodeOnChain(inviteCode, walletAddress, name);
    } catch (err) {
      console.warn("Soroban addMember notice:", err);
    }

    try {
      const res = await fetch(`/api/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: groupId,
          action: "addMember",
          memberName: name,
          walletAddress,
          email,
        }),
      });
      const data = await res.json();
      if (data.success && data.group) {
        return data.group;
      }
    } catch (err) {
      console.warn("API addMember error:", err);
    }

    const groups = await groupRepository.fetchGroups(walletAddress);
    const group = groups.find((g) => g.id === groupId);
    if (group) return group;

    return {
      id: groupId,
      name: "Group",
      description: "",
      currency: "XLM",
      ownerWallet: walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "Active",
      totalExpenses: 0,
      pendingBalance: 0,
      members: [
        {
          id: walletAddress,
          name,
          walletAddress,
          email,
          joinedAt: new Date().toISOString(),
          role: "Member",
        },
      ],
    };
  },

  async removeMember(groupId: string, memberId: string): Promise<Group> {
    try {
      await removeMemberOnChain(groupId, memberId);
    } catch (err) {
      console.warn("Soroban removeMember notice:", err);
    }

    try {
      const res = await fetch(`/api/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: groupId,
          action: "removeMember",
          memberId,
        }),
      });
      const data = await res.json();
      if (data.success && data.group) {
        return data.group;
      }
    } catch (err) {
      console.warn("API removeMember error:", err);
    }

    const groups = await groupRepository.fetchGroups();
    return (
      groups.find((g) => g.id === groupId) || {
        id: groupId,
        name: "",
        description: "",
        currency: "XLM",
        ownerWallet: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "Active",
        totalExpenses: 0,
        pendingBalance: 0,
        members: [],
      }
    );
  },

  async deleteGroup(groupId: string): Promise<void> {
    try {
      await deleteGroupOnChain(groupId);
    } catch (err) {
      console.warn("Soroban deleteGroup notice:", err);
    }

    try {
      await fetch(`/api/groups?id=${encodeURIComponent(groupId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("API deleteGroup notice:", err);
    }
  },
};
