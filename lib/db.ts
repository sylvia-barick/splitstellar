import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
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

// Global reference for in-memory caching to share data across serverless instances where possible
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

  let dbDir = path.join(process.cwd(), ".data");
  let dbFile = path.join(dbDir, "splitstellar-db.json");

  // Attempt to create the directory locally. If it fails, fall back to /tmp/
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err) {
    console.warn("Read-only filesystem detected at process.cwd(). Falling back to system temp directory.");
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

// Synchronously load the database state from Supabase if configured (called only once on cold start)
function syncLoadFromSupabase() {
  if (!isSupabaseConfigured || globalForDb.supabaseLoaded) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return;

  try {
    const tempScriptPath = path.join(os.tmpdir(), "sync-load.js");
    const scriptContent = `
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('${supabaseUrl}', '${supabaseAnonKey}');
supabase.from('users').select('name').eq('wallet_address', 'db_state').single()
  .then(({ data, error }) => {
    if (error) {
      process.exit(1);
    }
    if (data && data.name) {
      process.stdout.write(data.name);
    }
    process.exit(0);
  })
  .catch(() => process.exit(1));
`;

    fs.writeFileSync(tempScriptPath, scriptContent, "utf-8");
    const result = execSync(`node "${tempScriptPath}"`, { encoding: "utf-8", timeout: 5000 });
    
    // Clean up temp script file
    try {
      fs.unlinkSync(tempScriptPath);
    } catch {}

    if (result && result.trim()) {
      const parsed = JSON.parse(result.trim()) as DatabaseSchema;
      globalForDb.splitstellarDb = {
        users: parsed.users || [],
        groups: parsed.groups || [],
        expenses: parsed.expenses || [],
        payments: parsed.payments || [],
        requests: parsed.requests || [],
        activities: parsed.activities || [],
        notifications: parsed.notifications || [],
        analyticsCache: parsed.analyticsCache,
      };
      globalForDb.supabaseLoaded = true;
      console.log("Database state successfully loaded synchronously from Supabase on cold start.");
      
      // Also save locally in tmp/cwd for fast sync on subsequent reads
      const { dbFile } = resolveDbPaths();
      try {
        fs.writeFileSync(dbFile, JSON.stringify(globalForDb.splitstellarDb, null, 2), "utf-8");
      } catch {}
    }
  } catch (err) {
    console.warn("Notice: Synchronous Supabase load did not find state or failed:", err instanceof Error ? err.message : err);
  }
}

export function getDb(): DatabaseSchema {
  if (!globalForDb.splitstellarDb) {
    // Try loading synchronously from Supabase on the very first call
    syncLoadFromSupabase();
  }

  if (globalForDb.splitstellarDb) {
    return globalForDb.splitstellarDb;
  }

  const { dbDir, dbFile } = resolveDbPaths();

  try {
    if (!fs.existsSync(dbFile)) {
      // Return initial DB but do not throw if write fails
      try {
        fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2), "utf-8");
      } catch (writeErr) {
        console.warn("Could not write initial DB file:", writeErr);
      }
      globalForDb.splitstellarDb = initialDb;
      return initialDb;
    }

    const content = fs.readFileSync(dbFile, "utf-8");
    if (!content.trim()) {
      globalForDb.splitstellarDb = initialDb;
      return initialDb;
    }

    const parsed = JSON.parse(content) as DatabaseSchema;
    const db = {
      users: parsed.users || [],
      groups: parsed.groups || [],
      expenses: parsed.expenses || [],
      payments: parsed.payments || [],
      requests: parsed.requests || [],
      activities: parsed.activities || [],
      notifications: parsed.notifications || [],
      analyticsCache: parsed.analyticsCache,
    };
    globalForDb.splitstellarDb = db;
    return db;
  } catch (err) {
    console.error("Error reading database file:", err);
    globalForDb.splitstellarDb = initialDb;
    return initialDb;
  }
}

export function saveDb(data: DatabaseSchema): void {
  globalForDb.splitstellarDb = data;
  const { dbFile } = resolveDbPaths();

  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file locally:", err);
  }

  // Backup to Supabase asynchronously if configured
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
