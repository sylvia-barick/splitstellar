import { Group, SupportedCurrency } from "@/types/group";
import { Member } from "@/types/member";
import { generateInviteCode } from "@/utils/inviteCode";
import {
  invokeContractTransaction,
  CONTRACT_IDS,
  toScAddress,
  resolveAddress,
  isValidAddress,
  xdr,
  sorobanServer,
  scValToNative,
} from "./contract";
import { Contract, rpc } from "@stellar/stellar-sdk";

export async function createGroupOnChain(
  name: string,
  description: string,
  currency: SupportedCurrency,
  ownerWallet: string,
  ownerName: string
): Promise<Group> {
  const activeOwner = await resolveAddress(ownerWallet);
  const groupId = `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const inviteCode = generateInviteCode();

  if (activeOwner) {
    const params = [
      toScAddress(activeOwner),
      xdr.ScVal.scvString(groupId),
      xdr.ScVal.scvString(name),
      xdr.ScVal.scvString(description || ""),
      xdr.ScVal.scvString(currency),
      xdr.ScVal.scvString(ownerName),
      xdr.ScVal.scvString(inviteCode),
    ];

    try {
      await invokeContractTransaction(
        CONTRACT_IDS.GROUP,
        "create_group",
        params,
        activeOwner
      );
    } catch (err) {
      console.warn("Soroban create_group on-chain fallback/log:", err);
    }
  }

  const now = new Date().toISOString();
  const ownerMember: Member = {
    id: groupId,
    name: ownerName,
    walletAddress: activeOwner || ownerWallet,
    joinedAt: now,
    role: "Owner",
  };

  return {
    id: groupId,
    name,
    description: description || "",
    currency,
    inviteCode,
    ownerWallet: activeOwner || ownerWallet,
    createdAt: now,
    updatedAt: now,
    status: "Active",
    totalExpenses: 0,
    pendingBalance: 0,
    members: [ownerMember],
  };
}

export async function updateGroupOnChain(
  groupId: string,
  name: string,
  description: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(groupId),
    xdr.ScVal.scvString(name),
    xdr.ScVal.scvString(description || ""),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.GROUP,
      "update_group",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban update_group notice:", err);
  }
}

export async function archiveGroupOnChain(
  groupId: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(groupId),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.GROUP,
      "archive_group",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban archive_group notice:", err);
  }
}

export async function deleteGroupOnChain(
  groupId: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) {
    console.warn("deleteGroupOnChain notice: No active wallet connected to perform delete transaction.");
    return;
  }

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(groupId),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.GROUP,
      "delete_group",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban delete_group notice:", err);
  }
}

export async function joinGroupByInviteCodeOnChain(
  inviteCode: string,
  userWallet?: string,
  userName?: string
): Promise<{ groupId?: string; inviteCode: string }> {
  const activeUser = await resolveAddress(userWallet);
  const cleanCode = inviteCode.toUpperCase().trim();

  if (activeUser) {
    const name = userName || `Member (${activeUser.slice(0, 4)}...${activeUser.slice(-4)})`;
    const params = [
      toScAddress(activeUser),
      xdr.ScVal.scvString(cleanCode),
      xdr.ScVal.scvString(name),
    ];

    try {
      await invokeContractTransaction(
        CONTRACT_IDS.GROUP,
        "join_group_by_code",
        params,
        activeUser
      );
    } catch (err) {
      console.warn("Soroban join_group_by_code notice:", err);
    }
  }

  return { inviteCode: cleanCode };
}

export async function removeMemberOnChain(
  groupId: string,
  memberWallet: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  const targetMember = await resolveAddress(memberWallet);
  if (!activeCaller || !targetMember) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(groupId),
    toScAddress(targetMember),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.GROUP,
      "remove_member",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban remove_member notice:", err);
  }
}

export async function fetchGroupsForWalletOnChain(
  walletAddress?: string
): Promise<Group[]> {
  const activeWallet = await resolveAddress(walletAddress);
  if (!activeWallet || !isValidAddress(activeWallet)) return [];

  try {
    const contract = new Contract(CONTRACT_IDS.GROUP);
    const simRes = await sorobanServer.simulateTransaction({
      operations: [
        contract.call("get_user_groups", toScAddress(activeWallet)),
      ],
    } as unknown as Parameters<typeof sorobanServer.simulateTransaction>[0]);

    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
      const rawNative = scValToNative(simRes.result.retval);
      if (Array.isArray(rawNative)) {
        return rawNative.map((g: Record<string, unknown>) => ({
          id: String(g.id || ""),
          name: String(g.name || ""),
          description: String(g.description || ""),
          currency: (g.currency as SupportedCurrency) || "XLM",
          inviteCode: String(g.invite_code || ""),
          ownerWallet: String(g.owner_wallet || activeWallet),
          createdAt: typeof g.created_at === "number" ? new Date(g.created_at * 1000).toISOString() : new Date().toISOString(),
          updatedAt: typeof g.updated_at === "number" ? new Date(g.updated_at * 1000).toISOString() : new Date().toISOString(),
          status: g.status === "Archived" ? "Archived" : "Active",
          totalExpenses: 0,
          pendingBalance: 0,
          members: Array.isArray(g.members)
            ? g.members.map((m: Record<string, unknown>) => ({
                id: String(m.id || m.wallet_address || ""),
                name: String(m.name || "Member"),
                walletAddress: String(m.wallet_address || ""),
                email: String(m.email || ""),
                joinedAt: typeof m.joined_at === "number" ? new Date(m.joined_at * 1000).toISOString() : new Date().toISOString(),
                role: m.role === "Owner" ? "Owner" : "Member",
              }))
            : [],
        }));
      }
    }
  } catch (err) {
    console.warn("Soroban simulate get_user_groups fallback:", err);
  }

  return [];
}
