import "server-only";

/**
 * The real dependencies for matching. The ONLY place outside src/server/supabase-admin.ts that touches the
 * service-role client. Server actions import this, never the admin client itself.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import type { MatchDeps } from "./run";

export async function matchDeps(): Promise<MatchDeps> {
  return { user: await createClient(), admin: createAdminClient };
}
