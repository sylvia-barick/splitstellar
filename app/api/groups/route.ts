import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { Group } from "@/types/group";
import { Member } from "@/types/member";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  const db = await getDb();
  let groups = db.groups;

  if (address) {
    const lower = address.toLowerCase();
    groups = groups.filter(
      (g) =>
        g.ownerWallet.toLowerCase() === lower ||
        g.members.some((m) => m.walletAddress.toLowerCase() === lower)
    );
  }

  return NextResponse.json({ success: true, groups });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, currency, ownerWallet, ownerName, inviteCode, initialMembers } = body;

    const db = await getDb();
    const now = new Date().toISOString();

    const ownerMember: Member = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: ownerName || "Group Owner",
      walletAddress: ownerWallet || "",
      joinedAt: now,
      role: "Owner",
    };

    const members: Member[] = [ownerMember];

    if (Array.isArray(initialMembers)) {
      initialMembers.forEach((m: { name: string; walletAddress: string; email?: string }) => {
        if (m.walletAddress && m.walletAddress.toLowerCase() !== ownerMember.walletAddress.toLowerCase()) {
          members.push({
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: m.name || "Member",
            walletAddress: m.walletAddress,
            email: m.email,
            joinedAt: now,
            role: "Member",
          });
        }
      });
    }

    const groupId = id || `grp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: Group = {
      id: groupId,
      name,
      description: description || "",
      currency: currency || "XLM",
      ownerWallet: ownerMember.walletAddress,
      inviteCode: inviteCode || `SPLIT-${groupId.slice(-6).toUpperCase()}`,
      createdAt: now,
      updatedAt: now,
      members,
      totalExpenses: 0,
      pendingBalance: 0,
      status: "Active",
    };

    const existingIndex = db.groups.findIndex((g) => g.id === newGroup.id);
    if (existingIndex >= 0) {
      db.groups[existingIndex] = newGroup;
    } else {
      db.groups.push(newGroup);
    }
    await saveDb(db);

    return NextResponse.json({ success: true, group: newGroup });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, memberName, walletAddress, memberId, email, groupData } = body;

    const db = await getDb();
    const groupIndex = db.groups.findIndex((g) => g.id === id);

    if (groupIndex === -1) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const group = db.groups[groupIndex];
    const now = new Date().toISOString();

    if (action === "addMember") {
      const exists = group.members.some(
        (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
      if (!exists) {
        const newMem: Member = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: memberName || "New Member",
          walletAddress,
          email,
          joinedAt: now,
          role: "Member",
        };
        group.members.push(newMem);
        group.updatedAt = now;
      }
    } else if (action === "removeMember") {
      group.members = group.members.filter((m) => m.id !== memberId && m.role !== "Owner");
      group.updatedAt = now;
    } else if (groupData) {
      db.groups[groupIndex] = { ...group, ...groupData, updatedAt: now };
    }

    await saveDb(db);
    return NextResponse.json({ success: true, group: db.groups[groupIndex] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing group ID" }, { status: 400 });
    }

    const db = await getDb();
    db.groups = db.groups.filter((g) => g.id !== id);
    db.expenses = db.expenses.filter((e) => e.groupId !== id);
    await saveDb(db);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete group" },
      { status: 500 }
    );
  }
}
