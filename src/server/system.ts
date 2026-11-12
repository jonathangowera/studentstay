import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/applications/status";
import { ROLES, type Role } from "@/lib/auth/roles";
import { countBeds, type BedCounts } from "@/lib/listings/beds";
import { BED_STATES, MODERATION_STATES, VERIFICATION_LABELS, verificationBadge, type ListingType, type ModerationState, type ReviewDecision } from "@/lib/listings/labels";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/tickets/labels";

/**
 * System administrator overview. Read only, with the administrator's own session (row-level security lets the
 * system administrator read every row of these tables). Counts use head requests, so the 1,000-row page limit
 * never cuts a total short.
 */
type Client = SupabaseClient<Database>;

type CountReply = PromiseLike<{ count: number | null; error: unknown }>;

export async function countEach<K extends string>(keys: readonly K[], query: (key: K) => CountReply): Promise<Record<K, number>> {
  const pairs = await Promise.all(
    keys.map(async (k) => {
      const { count, error } = await query(k);
      if (error) throw error;
      return [k, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<K, number>;
}

const HEAD = { count: "exact", head: true } as const;
const REVIEW_DECISIONS: readonly ReviewDecision[] = ["verified", "pending", "requires_review", "resubmission_required"];
const APPLICATION_STATUSES = Object.keys(STATUS_LABEL) as ApplicationStatus[];

export type SystemCounts = {
  roles: Record<Role, number>;
  verification: Record<(typeof VERIFICATION_LABELS)[number], number>;
  moderation: Record<ModerationState, number>;
  applications: Record<ApplicationStatus, number>;
  tickets: Record<TicketStatus, number>;
  beds: BedCounts;
};

export async function systemCounts(supabase: Client): Promise<SystemCounts> {
  const [roles, decisions, moderation, applications, tickets, beds] = await Promise.all([
    countEach(ROLES, (r) => supabase.from("profiles").select("id", HEAD).eq("role", r)),
    countEach(REVIEW_DECISIONS, (v) => supabase.from("listings").select("id", HEAD).eq("verification", v)),
    countEach(MODERATION_STATES, (m) => supabase.from("listings").select("id", HEAD).eq("moderation", m)),
    countEach(APPLICATION_STATUSES, (s) => supabase.from("applications").select("id", HEAD).eq("status", s)),
    countEach(TICKET_STATUSES, (s) => supabase.from("maintenance_tickets").select("id", HEAD).eq("status", s)),
    countEach(
      BED_STATES.map((b) => b.state),
      (s) => supabase.from("beds").select("id", HEAD).eq("state", s),
    ),
  ]);
  // Grouped by the badge students see, so the wording stays the three allowed badge texts.
  const verification = Object.fromEntries(VERIFICATION_LABELS.map((l) => [l, 0])) as SystemCounts["verification"];
  for (const d of REVIEW_DECISIONS) verification[verificationBadge(d).label as (typeof VERIFICATION_LABELS)[number]] += decisions[d];
  return { roles, verification, moderation, applications, tickets, beds };
}

export type AuditRow = {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_role: Role | null;
  action: string;
  record_type: string | null;
  record_id: string | null;
  outcome: string;
  actor_name: string | null;
};

/** The latest audit events, with the actor's name where the profile can be read. */
export async function latestAudit(supabase: Client, limit = 10): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("id, created_at, actor_id, actor_role, action, record_type, record_id, outcome")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people, error: peopleError } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    if (peopleError) throw peopleError;
    for (const p of people ?? []) if (p.full_name) names.set(p.id, p.full_name);
  }
  return rows.map((r) => ({ ...r, actor_name: r.actor_id ? (names.get(r.actor_id) ?? null) : null }));
}

export type SystemListing = {
  id: string;
  name: string;
  type: ListingType;
  area: string;
  moderation: ModerationState;
  verification: ReviewDecision;
  last_updated_at: string;
  partner: string | null;
  beds: BedCounts;
};

/** Every listing on the platform, with its partner and beds by state. Columns on listings, rooms and beds are named. */
export async function allListings(supabase: Client): Promise<SystemListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, name, type, area, moderation, verification, last_updated_at, partners(business_name), rooms(id, beds(id, state))")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(({ partners, rooms, ...l }) => ({
    ...l,
    partner: partners?.business_name ?? null,
    beds: countBeds((rooms ?? []).flatMap((r) => (r.beds ?? []).map((b) => b.state))),
  }));
}

export async function listingModeration(supabase: Client, id: string): Promise<{ id: string; name: string; moderation: ModerationState } | null> {
  const { data, error } = await supabase.from("listings").select("id, name, moderation").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type SystemUser = { id: string; full_name: string; role: Role; institution: string | null; created_at: string };

/** Every account, read only: name, role, institution. No contact details. */
export async function allUsers(supabase: Client): Promise<SystemUser[]> {
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, created_at, institutions(name)").order("full_name").limit(1000);
  if (error) throw error;
  return (data ?? []).map(({ institutions, ...p }) => ({ ...p, institution: institutions?.name ?? null }));
}
