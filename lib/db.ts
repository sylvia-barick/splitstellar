import fs from "fs";
import path from "path";
import { Group } from "@/types/group";
import { Expense } from "@/types/expense";
import { Payment, MoneyRequest, ActivityItem } from "@/types/payment";

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

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "splitstellar-db.json");

const initialDb: DatabaseSchema = {
  users: [],
  groups: [],
  expenses: [],
  payments: [],
  requests: [],
  activities: [],
  notifications: [],
};

export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }

    const content = fs.readFileSync(DB_FILE, "utf-8");
    if (!content.trim()) {
      return initialDb;
    }

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
    return initialDb;
  }
}

export function saveDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}
