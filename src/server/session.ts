import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { destinationAfterSignIn, isRole, signInUrlFor, type Role } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Session = {
  userId: string;
  email: string | null;
  role: Role;
  profile: Profile;
};

/**
 * The signed-in person and their profile, or null when signed out.
 * The identity comes from getClaims (verified token), the role from the profiles table, never from the browser.
 * Memoised for one render pass.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || !isRole(profile.role)) {
    const friendly = reportError("load profile", profileError ?? new Error("PROFILE_MISSING"));
    throw new Error(`Could not load your profile (${friendly.reference})`);
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { userId, email, role: profile.role, profile };
});

/** Use at the top of every protected page and Server Function. Redirects when the check fails. */
export async function requireRole(allowed: Role | readonly Role[], currentPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(signInUrlFor(currentPath));
  const list: readonly Role[] = typeof allowed === "string" ? [allowed] : allowed;
  if (!list.includes(session.role)) redirect("/no-access");
  return session;
}

/** Any signed-in role. */
export async function requireSession(currentPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(signInUrlFor(currentPath));
  return session;
}

type Client = SupabaseClient<Database>;

export async function hasPartner(supabase: Client, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Where a person goes straight after signing in or confirming their email.
 * Owners without a business record go to the set-up step first.
 */
export async function destinationForUser(supabase: Client, userId: string, next: string | null): Promise<string> {
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error || !isRole(profile.role)) throw error ?? new Error("PROFILE_MISSING");
  if (profile.role === "owner" && !(await hasPartner(supabase, userId))) return "/owner/setup";
  return destinationAfterSignIn(profile.role, next);
}
