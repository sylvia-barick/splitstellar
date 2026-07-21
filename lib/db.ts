import fs from "fs";
import path from "path";
import os from "os";
import { Group } from "@/types/group";
import { Expense } from "@/types/expense";
import { Payment, MoneyRequest, ActivityItem } from "@/types/payment";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface UserProfile {
  walletAddress: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  walletAddress: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsCache {
  totalSpend: number;
  monthlySpend: number;
  dailySpend: number;
  categorySpend: Record<string, number>;
  settlementRatio: number;
  topSpenders: { wallet: string; amount: number }[];
  paymentSuccessRate: number;
  averageSettlementTimeMinutes: number;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: UserProfile[];
  groups: Group[];
  expenses: Expense[];
  payments: Payment[];
  requests: MoneyRequest[];
  activities: ActivityItem[];
  notifications: AppNotification[];
  analyticsCache?: AnalyticsCache;
}

const initialDb: DatabaseSchema = {
  users: [],
  groups: [],
  expenses: [],
  payments: [],
  requests: [],
  activities: [],
  notifications: [],
};

// Global reference for in-memory caching.
// On Vercel serverless, each function instance has its own memory but the global
// persists within the same warm instance between requests, which is the best we
// can do without an external DB. Supabase should be configured for multi-instance
// persistence.
const globalForDb = global as unknown as {
  splitstellarDb: DatabaseSchema | null;
  dbPathResolved: string | null;
  dbDirResolved: string | null;
  supabaseLoaded: boolean;
};

if (!globalForDb.splitstellarDb) {
  globalForDb.splitstellarDb = null;
  globalForDb.dbPathResolved = null;
  globalForDb.dbDirResolved = null;
  globalForDb.supabaseLoaded = false;
}

function resolveDbPaths() {
  if (globalForDb.dbPathResolved && globalForDb.dbDirResolved) {
    return { dbDir: globalForDb.dbDirResolved, dbFile: globalForDb.dbPathResolved };
  }

  // Try the project .data dir first; fall back to OS temp dir (needed on Vercel)
  let dbDir = path.join(process.cwd(), ".data");
  let dbFile = path.join(dbDir, "splitstellar-db.json");

  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    // Quick write-test to verify the directory is writable
    const testFile = path.join(dbDir, ".write-test");
    fs.writeFileSync(testFile, "1");
    fs.unlinkSync(testFile);
  } catch {
    // process.cwd() is read-only (Vercel serverless) — use /tmp instead
    console.warn("Filesystem at process.cwd() is read-only. Using system temp directory for DB.");
    dbDir = path.join(os.tmpdir(), "splitstellar");
    dbFile = path.join(dbDir, "splitstellar-db.json");
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (e) {
      console.error("Failed to create backup database directory in tmp:", e);
    }
  }

  globalForDb.dbDirResolved = dbDir;
  globalForDb.dbPathResolved = dbFile;
  return { dbDir, dbFile };
}

/**
 * Load DB state from Supabase asynchronously.
 * Called on cold start if Supabase is configured, so the in-memory cache
 * stays warm with the latest persisted data across serverless instances.
 */
async function loadFromSupabase(): Promise<DatabaseSchema | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("wallet_address", "db_state")
      .single();

    if (error || !data?.name) return null;

    const parsed = JSON.parse(data.name) as DatabaseSchema;
    return {
      users: parsed.users || [],
      groups: parsed.groups || [],
      expenses: parsed.expenses || [],
      payments: parsed.payments || [],
      requests: parsed.requests || [],
      activities: parsed.activities || [],
      notifications: parsed.notifications || [],
      analyticsCache: parsed.analyticsCache,
    };
  } catch (err) {
    console.warn("Supabase DB load notice:", err instanceof Error ? err.message : err);
    return null;
  }
}

function readDbFromFile(): DatabaseSchema {
  const { dbFile } = resolveDbPaths();
  try {
    if (!fs.existsSync(dbFile)) {
      try {
        fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2), "utf-8");
      } catch {
        // ignore write error (read-only fs)
      }
      return { ...initialDb };
    }

    const content = fs.readFileSync(dbFile, "utf-8");
    if (!content.trim()) return { ...initialDb };

    const parsed = JSON.parse(content) as DatabaseSchema;
    return {
      users: parsed.users || [],
      groups: parsed.groups || [],
      expenses: parsed.expenses || [],
      payments: parsed.payments || [],
      requests: parsed.requests || [],
      activities: parsed.activities || [],
      notifications: parsed.notifications || [],
      analyticsCache: parsed.analyticsCache,
    };
  } catch (err) {
    console.error("Error reading database file:", err);
    return { ...initialDb };
  }
}

export function getDb(): DatabaseSchema {
  // Return in-memory cached version if available
  if (globalForDb.splitstellarDb) {
    return globalForDb.splitstellarDb;
  }

  // Load from file (synchronous — fine for API routes)
  const db = readDbFromFile();
  globalForDb.splitstellarDb = db;

  // Kick off async Supabase warm-up for the next request (fire-and-forget)
  if (isSupabaseConfigured && !globalForDb.supabaseLoaded) {
    loadFromSupabase().then((supabaseDb) => {
      if (supabaseDb) {
        globalForDb.splitstellarDb = supabaseDb;
        globalForDb.supabaseLoaded = true;
        // Also persist locally so subsequent file reads are fresh
        const { dbFile } = resolveDbPaths();
        try {
          fs.writeFileSync(dbFile, JSON.stringify(supabaseDb, null, 2), "utf-8");
        } catch {
          // ignore
        }
      }
    });
  }

  return db;
}

export function saveDb(data: DatabaseSchema): void {
  // Always update in-memory cache immediately
  globalForDb.splitstellarDb = data;

  // Persist to local file (best-effort — may fail on Vercel read-only fs)
  const { dbFile } = resolveDbPaths();
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write DB to local file (expected on Vercel):", err instanceof Error ? err.message : err);
  }

  // Backup to Supabase asynchronously if configured (this is the durable store)
  if (isSupabaseConfigured) {
    supabase
      .from("users")
      .upsert(
        {
          wallet_address: "db_state",
          name: JSON.stringify(data),
        },
        { onConflict: "wallet_address" }
      )
      .then(({ error }) => {
        if (error) {
          console.error("Error backing up DB to Supabase:", error);
        } else {
          globalForDb.supabaseLoaded = true;
        }
      });
  }
}
