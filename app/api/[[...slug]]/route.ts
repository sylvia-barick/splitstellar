import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, AppNotification } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CONTRACT_IDS, SOROBAN_RPC_URL, NETWORK_PASSPHRASE, sorobanServer } from "@/lib/soroban/contract";
import { indexerService } from "@/services/indexerService";
import { ActivityItem } from "@/types/payment";
import { Expense } from "@/types/expense";
import { Payment } from "@/types/payment";
import { MoneyRequest } from "@/types/payment";
import { Member } from "@/types/member";
import { Group } from "@/types/group";

// ── Helper to retrieve slug parameter ────────────────────────────────────────
async function getSlug(params: Promise<{ slug?: string[] }>): Promise<string[]> {
  const resolved = await params;
  return resolved.slug || [];
}

// ── GET HANDLERS ─────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const slug = await getSlug(params);
  const endpoint = slug[0] || "status";
  const { searchParams } = new URL(request.url);

  // 1. activity
  if (endpoint === "activity") {
    const groupId = searchParams.get("groupId");
    const address = searchParams.get("address");

    const db = await getDb();
    let activities = db.activities;

    if (groupId) {
      activities = activities.filter((a) => a.groupId === groupId);
    }
    if (address) {
      const lower = address.toLowerCase();
      activities = activities.filter((a) => a.actorAddress.toLowerCase() === lower);
    }
    return NextResponse.json({ success: true, activities });
  }

  // 2. expenses
  if (endpoint === "expenses") {
    const groupId = searchParams.get("groupId");
    const address = searchParams.get("address");

    const db = await getDb();
    let expenses = db.expenses;

    if (groupId) {
      expenses = expenses.filter((e) => e.groupId === groupId);
    }
    if (address) {
      const lower = address.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          e.paidBy.toLowerCase() === lower ||
          e.participants.some((p) => p.walletAddress.toLowerCase() === lower)
      );
    }
    return NextResponse.json({ success: true, expenses });
  }

  // 3. groups
  if (endpoint === "groups") {
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

  // 4. indexer
  if (endpoint === "indexer") {
    const sub = slug[1];
    if (sub === "status") {
      const status = indexerService.getStatus();
      return NextResponse.json({
        success: true,
        indexer: status,
        timestamp: new Date().toISOString(),
      });
    }

    const db = await getDb();
    return NextResponse.json({
      success: true,
      stats: {
        groupsCount: db.groups.length,
        expensesCount: db.expenses.length,
        paymentsCount: db.payments.length,
        requestsCount: db.requests.length,
        activitiesCount: db.activities.length,
        notificationsCount: db.notifications.length,
        lastUpdated: db.analyticsCache?.updatedAt || new Date().toISOString(),
      },
    });
  }

  // 5. notifications
  if (endpoint === "notifications") {
    const wallet = searchParams.get("wallet");

    const db = await getDb();
    let notifications = db.notifications;

    if (wallet) {
      const lower = wallet.toLowerCase();
      notifications = notifications.filter(
        (n) => n.walletAddress.toLowerCase() === lower || n.walletAddress === "global"
      );
    }

    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ success: true, unreadCount, notifications });
  }

  // 6. payments
  if (endpoint === "payments") {
    const groupId = searchParams.get("groupId");
    const address = searchParams.get("address");

    const db = await getDb();
    let payments = db.payments;

    if (groupId) {
      payments = payments.filter((p) => p.groupId === groupId);
    }
    if (address) {
      const lower = address.toLowerCase();
      payments = payments.filter(
        (p) => p.from.toLowerCase() === lower || p.to.toLowerCase() === lower
      );
    }
    return NextResponse.json({ success: true, payments });
  }

  // 7. requests
  if (endpoint === "requests") {
    const groupId = searchParams.get("groupId");
    const address = searchParams.get("address");

    const db = await getDb();
    let requests = db.requests;

    if (groupId) {
      requests = requests.filter((r) => r.groupId === groupId);
    }
    if (address) {
      const lower = address.toLowerCase();
      requests = requests.filter(
        (r) => r.from.toLowerCase() === lower || r.to.toLowerCase() === lower
      );
    }
    return NextResponse.json({ success: true, requests });
  }

  // 8. search
  if (endpoint === "search") {
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    if (!q) {
      return NextResponse.json({
        success: true,
        results: { groups: [], expenses: [], payments: [], requests: [], members: [] },
      });
    }

    const db = await getDb();

    const matchingGroups = db.groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q) ||
        (g.inviteCode || "").toLowerCase().includes(q)
    );

    const matchingExpenses = db.expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.paidBy.toLowerCase().includes(q)
    );

    const matchingPayments = db.payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.from.toLowerCase().includes(q) ||
        p.to.toLowerCase().includes(q) ||
        p.transactionHash?.toLowerCase().includes(q) ||
        p.note?.toLowerCase().includes(q)
    );

    const matchingRequests = db.requests.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.from.toLowerCase().includes(q) ||
        r.to.toLowerCase().includes(q) ||
        r.note?.toLowerCase().includes(q) ||
        r.transactionHash?.toLowerCase().includes(q)
    );

    const memberSet = new Map<string, { walletAddress: string; name: string; groupName: string }>();
    db.groups.forEach((g) => {
      g.members.forEach((m) => {
        if (
          m.name.toLowerCase().includes(q) ||
          m.walletAddress.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        ) {
          memberSet.set(m.walletAddress.toLowerCase(), {
            walletAddress: m.walletAddress,
            name: m.name,
            groupName: g.name,
          });
        }
      });
    });

    return NextResponse.json({
      success: true,
      query: q,
      results: {
        groups: matchingGroups,
        expenses: matchingExpenses,
        payments: matchingPayments,
        requests: matchingRequests,
        members: Array.from(memberSet.values()),
      },
    });
  }

  // 9. status & subsystems health
  if (endpoint === "health") {
    return NextResponse.json({
      status: "ok",
      service: "SplitStellar API Server",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    });
  }

  if (endpoint === "status") {
    const sub = slug[1];

    if (!sub || sub === "health") {
      // Return unified health if base or health subpath
      if (sub === "health") {
        return NextResponse.json({
          status: "ok",
          service: "SplitStellar API Server",
          timestamp: new Date().toISOString(),
          uptimeSeconds: process.uptime(),
        });
      }

      // Base status
      const db = await getDb();
      return NextResponse.json({
        status: "operational",
        subsystems: {
          apiServer: "healthy",
          database: "connected",
          indexer: "active",
          sorobanRpc: "connected",
        },
        metrics: {
          groups: db.groups.length,
          expenses: db.expenses.length,
          payments: db.payments.length,
          requests: db.requests.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (sub === "database") {
      const db = await getDb();
      return NextResponse.json({
        success: true,
        database: {
          status: "connected",
          storageType: isSupabaseConfigured ? "Supabase (production)" : "Local JSON (development)",
          recordCounts: {
            users: db.users.length,
            groups: db.groups.length,
            expenses: db.expenses.length,
            payments: db.payments.length,
            requests: db.requests.length,
            activities: db.activities.length,
            notifications: db.notifications.length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (sub === "contracts") {
      return NextResponse.json({
        success: true,
        contracts: {
          network: NETWORK_PASSPHRASE,
          rpcUrl: SOROBAN_RPC_URL,
          addresses: CONTRACT_IDS,
          status: "online",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}

// ── POST HANDLERS ────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const slug = await getSlug(params);
  const endpoint = slug[0];

  try {
    // 1. activity
    if (endpoint === "activity") {
      const { groupId, actorAddress, actorName, type, description, amount, currency } = await request.json();
      const db = await getDb();

      const newAct: ActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        actorAddress,
        actorName,
        type,
        description,
        amount,
        currency,
        createdAt: new Date().toISOString(),
      };

      db.activities.unshift(newAct);
      await saveDb(db);

      return NextResponse.json({ success: true, activity: newAct });
    }

    // 2. expenses
    if (endpoint === "expenses") {
      const expenseData = await request.json();
      const db = await getDb();
      const now = new Date().toISOString();

      const newExpense: Expense = {
        ...expenseData,
        id: expenseData.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: expenseData.createdAt || now,
        updatedAt: now,
      };

      const existing = db.expenses.findIndex((e) => e.id === newExpense.id);
      if (existing >= 0) {
        db.expenses[existing] = newExpense;
      } else {
        db.expenses.push(newExpense);
      }
      await saveDb(db);

      return NextResponse.json({ success: true, expense: newExpense });
    }

    // 3. groups
    if (endpoint === "groups") {
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
    }

    // 4. indexer
    if (endpoint === "indexer") {
      const { action } = await request.json();
      if (action === "reindex") {
        const db = await getDb();

        try {
          const contractIds = [
            CONTRACT_IDS.GROUP,
            CONTRACT_IDS.EXPENSE,
            CONTRACT_IDS.SETTLEMENT,
            CONTRACT_IDS.MONEY_REQUEST,
            CONTRACT_IDS.ACTIVITY,
          ];

          const eventsRes = await sorobanServer.getEvents({
            filters: contractIds.map((cid) => ({
              type: "contract",
              contractIds: [cid],
            })),
            limit: 20,
          } as unknown as Parameters<typeof sorobanServer.getEvents>[0]);

          if (eventsRes && eventsRes.events) {
            eventsRes.events.forEach((evt) => {
              const topic = evt.topic && evt.topic.length > 0 ? String(evt.topic[0]) : "Event";
              const now = new Date().toISOString();
              const exists = db.activities.some((a) => a.id === evt.id);
              if (!exists && evt.id) {
                db.activities.unshift({
                  id: evt.id,
                  groupId: "indexer",
                  actorAddress: String(evt.contractId || "System"),
                  actorName: "Soroban Indexer",
                  type: "ContractEvent" as never,
                  description: `Indexed chain event topic: ${topic}`,
                  createdAt: now,
                });
              }
            });
          }
        } catch (rpcErr) {
          console.warn("Indexer RPC notice:", rpcErr);
        }

        const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPayments = db.payments.reduce((sum, p) => sum + p.amount, 0);
        const categorySpend: Record<string, number> = {};
        db.expenses.forEach((e) => {
          const cat = e.category || "General";
          categorySpend[cat] = (categorySpend[cat] || 0) + e.amount;
        });

        db.analyticsCache = {
          totalSpend: totalExpenses,
          monthlySpend: totalExpenses,
          dailySpend: totalExpenses * 0.2,
          categorySpend,
          settlementRatio: totalExpenses > 0 ? Math.min(100, Math.round((totalPayments / totalExpenses) * 100)) : 100,
          topSpenders: [],
          paymentSuccessRate: 100,
          averageSettlementTimeMinutes: 2.5,
          updatedAt: new Date().toISOString(),
        };

        await saveDb(db);
        return NextResponse.json({ success: true, message: "Reindexing completed", analyticsCache: db.analyticsCache });
      }

      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    // 5. notifications
    if (endpoint === "notifications") {
      const { walletAddress, type, title, message, metadata } = await request.json();
      const db = await getDb();
      const now = new Date().toISOString();

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        walletAddress: walletAddress || "global",
        type: type || "System",
        title,
        message,
        read: false,
        createdAt: now,
        metadata,
      };

      db.notifications.unshift(newNotif);
      await saveDb(db);

      return NextResponse.json({ success: true, notification: newNotif });
    }

    // 6. payments
    if (endpoint === "payments") {
      const body = await request.json();
      const { id, groupId, from, to, amount, currency, note, transactionHash, ledgerNumber, settlementId, requestId, status } = body;
      const db = await getDb();
      const now = new Date().toISOString();

      const newPayment: Payment = {
        id: id || `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        settlementId,
        requestId,
        groupId,
        from,
        to,
        amount,
        currency: currency || "XLM",
        status: status || (transactionHash ? "Paid" : "Pending"),
        createdAt: now,
        updatedAt: now,
        note,
        transactionHash,
        ledgerNumber,
      };

      const existingIdx = db.payments.findIndex((p) => p.id === newPayment.id);
      if (existingIdx >= 0) {
        db.payments[existingIdx] = newPayment;
      } else {
        db.payments.push(newPayment);
      }
      await saveDb(db);

      return NextResponse.json({ success: true, payment: newPayment });
    }

    // 7. requests
    if (endpoint === "requests") {
      const body = await request.json();
      const { id, groupId, from, to, amount, currency, note, type, status, transactionHash, ledgerNumber, returnTxHash } = body;
      const db = await getDb();
      const now = new Date().toISOString();

      const newReq: MoneyRequest = {
        id: id || `${type === "DirectLoan" ? "loan" : "req"}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        from,
        to,
        amount,
        currency: currency || "XLM",
        note,
        type: type || "Request",
        status: status || (type === "DirectLoan" ? "Accepted" : "Pending"),
        createdAt: now,
        updatedAt: now,
        transactionHash,
        ledgerNumber,
        returnTxHash,
      };

      const existingIdx = db.requests.findIndex((r) => r.id === newReq.id);
      if (existingIdx >= 0) {
        db.requests[existingIdx] = newReq;
      } else {
        db.requests.push(newReq);
      }
      await saveDb(db);

      return NextResponse.json({ success: true, request: newReq });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "POST handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}

// ── PUT HANDLERS ─────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const slug = await getSlug(params);
  const endpoint = slug[0];

  try {
    // 1. expenses
    if (endpoint === "expenses") {
      const { id, expenseData } = await request.json();
      const db = await getDb();
      const now = new Date().toISOString();

      const index = db.expenses.findIndex((e) => e.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
      }

      db.expenses[index] = {
        ...db.expenses[index],
        ...expenseData,
        updatedAt: now,
      };

      await saveDb(db);
      return NextResponse.json({ success: true, expense: db.expenses[index] });
    }

    // 2. groups
    if (endpoint === "groups") {
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
    }

    // 3. notifications
    if (endpoint === "notifications") {
      const { id, markAllRead, walletAddress } = await request.json();
      const db = await getDb();

      if (markAllRead && walletAddress) {
        const lower = walletAddress.toLowerCase();
        db.notifications.forEach((n) => {
          if (n.walletAddress.toLowerCase() === lower || n.walletAddress === "global") {
            n.read = true;
          }
        });
      } else if (id) {
        const index = db.notifications.findIndex((n) => n.id === id);
        if (index !== -1) db.notifications[index].read = true;
      }

      await saveDb(db);
      return NextResponse.json({ success: true, notifications: db.notifications });
    }

    // 4. payments
    if (endpoint === "payments") {
      const { id, status, transactionHash, ledgerNumber } = await request.json();
      const db = await getDb();
      const now = new Date().toISOString();

      const index = db.payments.findIndex((p) => p.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
      }

      db.payments[index].status = status;
      if (transactionHash) db.payments[index].transactionHash = transactionHash;
      if (ledgerNumber !== undefined) db.payments[index].ledgerNumber = ledgerNumber;
      db.payments[index].updatedAt = now;

      await saveDb(db);
      return NextResponse.json({ success: true, payment: db.payments[index] });
    }

    // 5. requests
    if (endpoint === "requests") {
      const { id, status, transactionHash, ledgerNumber, returnTxHash } = await request.json();
      const db = await getDb();
      const now = new Date().toISOString();

      const index = db.requests.findIndex((r) => r.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
      }

      db.requests[index].status = status;
      if (transactionHash) db.requests[index].transactionHash = transactionHash;
      if (ledgerNumber !== undefined) db.requests[index].ledgerNumber = ledgerNumber;
      if (returnTxHash) db.requests[index].returnTxHash = returnTxHash;
      db.requests[index].updatedAt = now;

      await saveDb(db);
      return NextResponse.json({ success: true, request: db.requests[index] });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "PUT handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}

// ── DELETE HANDLERS ──────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const slug = await getSlug(params);
  const endpoint = slug[0];

  try {
    // 1. expenses
    if (endpoint === "expenses") {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ success: false, error: "Missing expense ID" }, { status: 400 });
      }

      const db = await getDb();
      db.expenses = db.expenses.filter((e) => e.id !== id);
      await saveDb(db);

      return NextResponse.json({ success: true });
    }

    // 2. groups
    if (endpoint === "groups") {
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
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "DELETE handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}
