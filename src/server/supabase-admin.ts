import "server-only";

/**
 * Service-role Supabase client. Bypasses row-level security, so:
 * - import it ONLY from src/server/allocation/ (a test enforces this: src/server/supabase-admin.test.ts)
 * - use it only AFTER the administrator's own session has shown they may act on the record
 * - never log the key, never send it to the browser, never give it the NEXT_PUBLIC_ prefix
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SERVICE_ROLE_MISSING: the server is not set up for matching");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
