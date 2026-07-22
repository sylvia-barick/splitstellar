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

const EMPTY_DB: DatabaseSchema = {
  users: [],
  groups: [],
  expenses: [],
  payments: [],
  requests: [],
  activities: [],
  notifications: [],
};

function cloneDb(src: DatabaseSchema): DatabaseSchema {
  return {
    users: src.users ?? [],
    groups: src.groups ?? [],
    expenses: src.expenses ?? [],
    payments: src.payments ?? [],
    requests: src.requests ?? [],
    activities: src.activities ?? [],
    notifications: src.notifications ?? [],
    analyticsCache: src.analyticsCache,
  };
}

// ─── Global singleton ────────────────────────────────────────────────────────
// On Vercel each serverless function keeps its own module scope between warm
// invocations on the same instance. We use a global object so the in-memory
// cache is shared across all API calls hitting the same warm lambda.
const g = global as unknown as {
  _ssDb: DatabaseSchema | null;
  _ssDbLoading: Promise<DatabaseSchema> | null;
  _ssDbFile: string | null;
  _ssDbWritable: boolean | null;
};
if (!g._ssDb) {
  g._ssDb = null;
  g._ssDbLoading = null;
  g._ssDbFile = null;
  g._ssDbWritable = null;
}

// ─── Local file helpers ───────────────────────────────────────────────────────
function resolveFile(): { file: string; writable: boolean } {
  if (g._ssDbFile !== null) {
    return { file: g._ssDbFile, writable: g._ssDbWritable ?? false };
  }

  const candidates = [
    path.join(process.cwd(), ".data", "splitstellar-db.json"),
    path.join(os.tmpdir(), "splitstellar", "splitstellar-db.json"),
  ];

  for (const file of candidates) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const probe = file + ".probe";
      fs.writeFileSync(probe, "1");
      fs.unlinkSync(probe);
      g._ssDbFile = file;
      g._ssDbWritable = true;
      return { file, writable: true };
    } catch {
      // try next candidate
    }
  }

  // Completely read-only (should not happen in practice, but be safe)
  g._ssDbFile = candidates[0];
  g._ssDbWritable = false;
  return { file: candidates[0], writable: false };
}

function readFile(): DatabaseSchema | null {
  try {
    const { file } = resolveFile();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8").trim();
    if (!raw) return null;
    return cloneDb(JSON.parse(raw) as DatabaseSchema);
  } catch {
    return null;
  }
}

function writeFile(data: DatabaseSchema): void {
  try {
    const { file, writable } = resolveFile();
    if (!writable) return;
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore — Vercel read-only fs
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
// The entire DB is stored as a single JSON blob in the `users` table under the
// synthetic key "db_state". This is the ONE durable store on Vercel.

async function supabaseLoad(): Promise<DatabaseSchema | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("wallet_address", "db_state")
      .maybeSingle();
    if (error || !data?.name) return null;
    return cloneDb(JSON.parse(data.name) as DatabaseSchema);
  } catch (err) {
    console.warn("[db] Supabase load error:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function supabaseSave(data: DatabaseSchema): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from("users").upsert(
      { wallet_address: "db_state", name: JSON.stringify(data) },
      { onConflict: "wallet_address" }
    );
    if (error) {
      console.error("[db] Supabase save error:", error.message);
    }
  } catch (err) {
    console.error("[db] Supabase save exception:", err instanceof Error ? err.message : err);
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
// Called once per cold-start. Returns a promise so concurrent API calls
// on the same cold-start wait for the SAME load instead of each firing their own.

function bootstrap(): Promise<DatabaseSchema> {
  if (g._ssDb !== null) {
    return Promise.resolve(g._ssDb);
  }
  if (g._ssDbLoading !== null) {
    return g._ssDbLoading;
  }

  g._ssDbLoading = (async () => {
    // 1. Supabase is the authoritative production store
    if (isSupabaseConfigured) {
      const remote = await supabaseLoad();
      if (remote) {
        g._ssDb = remote;
        writeFile(remote); // warm the local file cache
        g._ssDbLoading = null;
        return remote;
      }
    }

    // 2. Local file (works perfectly in development, and on first Vercel deploy)
    const local = readFile();
    if (local) {
      g._ssDb = local;
      // If Supabase is configured, push the local data up so it's durable
      if (isSupabaseConfigured) {
        supabaseSave(local).catch(() => {});
      }
      g._ssDbLoading = null;
      return local;
    }

    // 3. Fresh install — empty database
    const empty = cloneDb(EMPTY_DB);
    g._ssDb = empty;
    g._ssDbLoading = null;
    return empty;
  })();

  return g._ssDbLoading;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getDb(): Promise<DatabaseSchema> {
  if (isSupabaseConfigured) {
    const remote = await supabaseLoad();
    if (remote) {
      g._ssDb = remote;
      writeFile(remote); // warm the local file cache
      return remote;
    }
  }
  if (g._ssDb !== null) return g._ssDb;
  return bootstrap();
}

/**
 * saveDb() — writes to in-memory cache, local file, AND Supabase (awaited).
 *
 * Awaiting Supabase ensures the data is durable before the API response is
 * sent, preventing loss when the serverless instance is recycled.
 */
export async function saveDb(data: DatabaseSchema): Promise<void> {
  g._ssDb = data;
  writeFile(data);
  await supabaseSave(data);
}
