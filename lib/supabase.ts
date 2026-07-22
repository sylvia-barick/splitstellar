import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// In production (Vercel), Supabase is the only durable storage.
// Log a clear warning if it is not configured so the issue is visible in logs.
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  !isSupabaseConfigured
) {
  console.error(
    "[SplitStellar] CRITICAL: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
    "are not set. Production data will not persist across server restarts. " +
    "Set these environment variables in your Vercel dashboard."
  );
}

// Use real credentials when configured, or safe non-functional placeholders locally.
// The placeholder client will never be called because isSupabaseConfigured === false
// guards every supabase call in lib/db.ts.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
