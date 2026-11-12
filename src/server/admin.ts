import "server-only";

/**
 * Reads for the university administrator's screens. Always the administrator's OWN session: row-level security
 * limits applications, profiles, runs and candidates to their institution. No service role here. Columns named.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ApplicationRoute, ApplicationStatus } from "@/lib/applications/status";
import type { GenderPolicy, RoomType } from "@/lib/listings/labels";

type Client = SupabaseClient<Database>;
type Decision = Database["public"]["Enums"]["allocation_decision"];

export type Student = { id: string; full_name: string; student_number: string | null; student_number_matched: boolean };

export type AdminApplication = {
  id: string;
  reference: string;
  route: ApplicationRoute;
  status: ApplicationStatus;
  status_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  listing_id: string | null;
  student: Student | null;
};

const LIST_COLUMNS =
  "id, reference, route, status, status_reason, submitted_at, created_at, listing_id, student:profiles!applications_student_id_fkey(id, full_name, student_number, student_number_matched)" as const;

/** The institution's applications, newest first, optionally one status. */
export async function institutionApplications(
  supabase: Client,
  institutionId: string,
  opts: { status?: ApplicationStatus; route?: ApplicationRoute; limit?: number } = {},
): Promise<AdminApplication[]> {
  let q = supabase.from("applications").select(LIST_COLUMNS).eq("institution_id", institutionId);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.route) q = q.eq("route", opts.route);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  if (error) throw error;
  return (data ?? []) as unknown as AdminApplication[];
}

export type QueueCounts = { toMatch: number; toApprove: number; profileIncomplete: number; noEligibleRoom: number; all: Partial<Record<ApplicationStatus, number>> };

/** Counts of the institution's university allocation applications by status, for the work queue. */
export async function queueCounts(supabase: Client, institutionId: string): Promise<QueueCounts> {
  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("institution_id", institutionId)
    .eq("route", "university_allocation");
  if (error) throw error;
  const all: Partial<Record<ApplicationStatus, number>> = {};
  for (const r of data ?? []) all[r.status] = (all[r.status] ?? 0) + 1;
  return {
    toMatch: all.submitted ?? 0,
    toApprove: all.pending_approval ?? 0,
    profileIncomplete: all.profile_incomplete ?? 0,
    noEligibleRoom: all.no_eligible_room ?? 0,
    all,
  };
}

// ---------------------------------------------------------------- one application under review

export type ReviewApplication = AdminApplication & {
  institution_id: string | null;
  requested_room_type: RoomType | null;
  budget_zmw: number | null;
  gender_needed: GenderPolicy | null;
  intake: string | null;
  preferred_facilities: string[];
};

export type RunRow = {
  id: string;
  created_at: string;
  explanation: string | null;
  decision: Decision;
  decided_at: string | null;
  decision_note: string | null;
  approved_bed_id: string | null;
  rule: { id: string; name: string; version: number } | null;
  runner: { full_name: string } | null;
  decider: { full_name: string } | null;
};

export type CandidateView = {
  id: string;
  rank: number | null;
  excluded: boolean;
  exclusionReason: string | null;
  bedId: string | null;
  bedLabel: string | null;
  roomNumber: string;
  roomType: RoomType;
  wing: string | null;
  price: number;
  rentUnit: string | null;
  listingId: string;
  listingName: string;
  scores: { roomType: number; budget: number; distance: number; facilities: number; availability: number; total: number } | null;
  explanation: string | null;
};

export type Rule = {
  id: string;
  name: string;
  version: number;
  active: boolean;
  created_at: string;
  hard_constraints: unknown;
  w_room_type: number;
  w_budget: number;
  w_distance: number;
  w_facilities: number;
  w_availability: number;
};

const RULE_COLUMNS = "id, name, version, active, created_at, hard_constraints, w_room_type, w_budget, w_distance, w_facilities, w_availability" as const;

export async function applicationForReview(supabase: Client, reference: string): Promise<ReviewApplication | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(`${LIST_COLUMNS}, institution_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities`)
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const a = data as unknown as ReviewApplication;
  return { ...a, budget_zmw: a.budget_zmw === null ? null : Number(a.budget_zmw), preferred_facilities: a.preferred_facilities ?? [] };
}

/** Every run of the application, newest first, with who ran and decided it. */
export async function runsFor(supabase: Client, applicationId: string): Promise<RunRow[]> {
  const { data, error } = await supabase
    .from("allocation_runs")
    .select(
      "id, created_at, explanation, decision, decided_at, decision_note, approved_bed_id, rule:allocation_rules(id, name, version), runner:profiles!allocation_runs_run_by_fkey(full_name), decider:profiles!allocation_runs_decided_by_fkey(full_name)",
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RunRow[];
}

type CandidateRow = {
  id: string;
  rank: number | null;
  excluded: boolean;
  exclusion_reason: string | null;
  bed_id: string | null;
  score_total: number | null;
  score_room_type: number | null;
  score_budget: number | null;
  score_distance: number | null;
  score_facilities: number | null;
  score_availability: number | null;
  explanation: string | null;
  room: { room_number: string; room_type: RoomType; price_zmw: number; wing: string | null; listing: { id: string; name: string; rent_unit: string | null } | null } | null;
  bed: { label: string } | null;
};

/** The run's ranked and excluded rooms, with room, bed and listing names. Ranked first, by rank. */
export async function candidatesFor(supabase: Client, runId: string): Promise<CandidateView[]> {
  const { data, error } = await supabase
    .from("allocation_candidates")
    .select(
      "id, rank, excluded, exclusion_reason, bed_id, score_total, score_room_type, score_budget, score_distance, score_facilities, score_availability, explanation, room:rooms(room_number, room_type, price_zmw, wing, listing:listings(id, name, rent_unit)), bed:beds(label)",
    )
    .eq("run_id", runId)
    .order("excluded", { ascending: true })
    .order("rank", { ascending: true, nullsFirst: false })
    .limit(400);
  if (error) throw error;
  const n = (v: number | null) => (v === null ? 0 : Number(v));
  return ((data ?? []) as unknown as CandidateRow[]).map((c) => ({
    id: c.id,
    rank: c.rank,
    excluded: c.excluded,
    exclusionReason: c.exclusion_reason,
    bedId: c.bed_id,
    bedLabel: c.bed?.label ?? null,
    roomNumber: c.room?.room_number ?? "?",
    roomType: c.room?.room_type ?? "single",
    wing: c.room?.wing ?? null,
    price: Number(c.room?.price_zmw ?? 0),
    rentUnit: c.room?.listing?.rent_unit ?? null,
    listingId: c.room?.listing?.id ?? "",
    listingName: c.room?.listing?.name ?? "A listing you cannot see",
    scores: c.excluded
      ? null
      : {
          roomType: n(c.score_room_type),
          budget: n(c.score_budget),
          distance: n(c.score_distance),
          facilities: n(c.score_facilities),
          availability: n(c.score_availability),
          total: n(c.score_total),
        },
    explanation: c.explanation,
  }));
}

export async function rulesFor(supabase: Client, institutionId: string): Promise<Rule[]> {
  const { data, error } = await supabase.from("allocation_rules").select(RULE_COLUMNS).eq("institution_id", institutionId).order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function ruleById(supabase: Client, ruleId: string): Promise<Rule | null> {
  const { data, error } = await supabase.from("allocation_rules").select(RULE_COLUMNS).eq("id", ruleId).maybeSingle();
  if (error) throw error;
  return data;
}

export type AdminBooking = { start_date: string; end_date: string; state: string; bed: { label: string; room: { room_number: string; wing: string | null; listing: { name: string } | null } | null } | null };

/** The booking made by an approval. Readable by an administrator of a partnered listing. */
export async function bookingForApplication(supabase: Client, applicationId: string): Promise<AdminBooking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("start_date, end_date, state, bed:beds(label, room:rooms(room_number, wing, listing:listings(name)))")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AdminBooking | null;
}

export async function institutionName(supabase: Client, institutionId: string): Promise<{ name: string; code: string } | null> {
  const { data, error } = await supabase.from("institutions").select("name, code").eq("id", institutionId).maybeSingle();
  if (error) throw error;
  return data;
}
