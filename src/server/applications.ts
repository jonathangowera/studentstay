import "server-only";

/**
 * Student application reads for slice S4. Every query runs as the signed-in student (publishable key + session),
 * so row-level security decides what they see: their own applications, events, runs, non-excluded candidates,
 * bookings and notifications. No service role. Columns are always named.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ApplicationRoute, ApplicationStatus, EventRow } from "@/lib/applications/status";
import type { Transition } from "@/lib/applications/rules";
import type { GenderPolicy, RoomType } from "@/lib/listings/labels";
import { isUuid } from "@/lib/listings/compare";

export type Client = SupabaseClient<Database>;

export const APPLICATION_COLUMNS =
  "id, reference, route, status, status_reason, institution_id, listing_id, requested_room_type, budget_zmw, gender_needed, intake, preferred_facilities, submitted_at, created_at, updated_at" as const;

export type MyApplication = {
  id: string;
  reference: string;
  route: ApplicationRoute;
  status: ApplicationStatus;
  status_reason: string | null;
  institution_id: string | null;
  listing_id: string | null;
  requested_room_type: RoomType | null;
  budget_zmw: number | null;
  gender_needed: GenderPolicy | null;
  intake: string | null;
  preferred_facilities: string[];
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The student's applications, newest first. */
export async function myApplications(supabase: Client, studentId: string): Promise<MyApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, budget_zmw: a.budget_zmw === null ? null : Number(a.budget_zmw) }));
}

export async function applicationByReference(supabase: Client, studentId: string, reference: string): Promise<MyApplication | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .eq("student_id", studentId)
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, budget_zmw: data.budget_zmw === null ? null : Number(data.budget_zmw) } : null;
}

/** "Riverside Hall" for private applications, "UNZA" style names for university ones. */
export type Targets = { listings: Map<string, { name: string; area: string | null }>; institutions: Map<string, string> };

export async function targetsFor(supabase: Client, apps: readonly Pick<MyApplication, "listing_id" | "institution_id">[]): Promise<Targets> {
  const listingIds = [...new Set(apps.map((a) => a.listing_id).filter((x): x is string => !!x && isUuid(x)))];
  const instIds = [...new Set(apps.map((a) => a.institution_id).filter((x): x is string => !!x && isUuid(x)))];
  const [l, i] = await Promise.all([
    listingIds.length ? supabase.from("listing_cards").select("id, name, area").in("id", listingIds) : Promise.resolve({ data: [], error: null }),
    instIds.length ? supabase.from("institutions").select("id, name").in("id", instIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (l.error) throw l.error;
  if (i.error) throw i.error;
  return {
    listings: new Map((l.data ?? []).filter((x) => x.id).map((x) => [x.id as string, { name: x.name ?? "A place", area: x.area }])),
    institutions: new Map((i.data ?? []).map((x) => [x.id, x.name])),
  };
}

export async function eventsFor(supabase: Client, applicationId: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("application_events")
    .select("from_status, to_status, note, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Allowed moves to withdrawn, from the state_transitions table. */
export async function withdrawTransitions(supabase: Client): Promise<Transition[]> {
  const { data, error } = await supabase
    .from("state_transitions")
    .select("machine, from_state, to_state")
    .eq("machine", "application")
    .eq("to_state", "withdrawn");
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------- where a bed is

export type BedPlace = {
  listingId: string;
  listingName: string;
  roomNumber: string;
  roomType: RoomType;
  wing: string | null;
  price: number;
  rentUnit: string | null;
  bedLabel: string | null;
};

async function roomPlace(supabase: Client, roomId: string, bedId: string | null): Promise<BedPlace | null> {
  const [roomRes, bedRes] = await Promise.all([
    supabase.from("rooms").select("id, room_number, room_type, price_zmw, wing, listing_id").eq("id", roomId).maybeSingle(),
    bedId ? supabase.from("beds").select("id, label").eq("id", bedId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (roomRes.error) throw roomRes.error;
  if (bedRes.error) throw bedRes.error;
  const room = roomRes.data;
  if (!room) return null;
  const { data: listing, error } = await supabase.from("listings").select("id, name, rent_unit").eq("id", room.listing_id).maybeSingle();
  if (error) throw error;
  return {
    listingId: room.listing_id,
    listingName: listing?.name ?? "The hostel",
    roomNumber: room.room_number,
    roomType: room.room_type,
    wing: room.wing,
    price: Number(room.price_zmw),
    rentUnit: listing?.rent_unit ?? null,
    bedLabel: bedRes.data?.label ?? null,
  };
}

async function bedPlace(supabase: Client, bedId: string): Promise<BedPlace | null> {
  const { data: bed, error } = await supabase.from("beds").select("id, room_id").eq("id", bedId).maybeSingle();
  if (error) throw error;
  return bed ? roomPlace(supabase, bed.room_id, bedId) : null;
}

// ---------------------------------------------------------------- recommendation and booking

export type Scores = { roomType: number; budget: number; distance: number; facilities: number; availability: number; total: number };

export type Recommendation = {
  runId: string;
  ranAt: string;
  decision: Database["public"]["Enums"]["allocation_decision"];
  runExplanation: string | null;
  place: BedPlace | null;
  scores: Scores | null;
  explanation: string | null;
};

const num = (v: number | string | null) => (v === null ? 0 : Number(v));

/** The latest engine run and its top-ranked room, as far as the student's row-level security allows. */
export async function recommendationFor(supabase: Client, applicationId: string): Promise<Recommendation | null> {
  const { data: run, error } = await supabase
    .from("allocation_runs")
    .select("id, explanation, decision, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!run) return null;

  const { data: cand, error: cErr } = await supabase
    .from("allocation_candidates")
    .select("room_id, bed_id, rank, score_total, score_room_type, score_budget, score_distance, score_facilities, score_availability, explanation")
    .eq("run_id", run.id)
    .eq("excluded", false)
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (cErr) throw cErr;

  return {
    runId: run.id,
    ranAt: run.created_at,
    decision: run.decision,
    runExplanation: run.explanation,
    place: cand ? await roomPlace(supabase, cand.room_id, cand.bed_id) : null,
    scores: cand
      ? {
          roomType: num(cand.score_room_type),
          budget: num(cand.score_budget),
          distance: num(cand.score_distance),
          facilities: num(cand.score_facilities),
          availability: num(cand.score_availability),
          total: num(cand.score_total),
        }
      : null,
    explanation: cand?.explanation ?? null,
  };
}

export type Booking = { startDate: string; endDate: string; state: Database["public"]["Enums"]["booking_state"]; place: BedPlace | null };

export async function bookingFor(supabase: Client, applicationId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("bed_id, start_date, end_date, state")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { startDate: data.start_date, endDate: data.end_date, state: data.state, place: await bedPlace(supabase, data.bed_id) };
}

// ---------------------------------------------------------------- apply page data

export type Institution = { id: string; code: string; name: string; status: string };

export async function allInstitutions(supabase: Client): Promise<Institution[]> {
  const { data, error } = await supabase.from("institutions").select("id, code, name, status").order("name");
  if (error) throw error;
  return data ?? [];
}

export type PlaceForApply = {
  id: string;
  name: string;
  area: string | null;
  type: Database["public"]["Enums"]["listing_type"] | null;
  gender: GenderPolicy | null;
  rentUnit: string | null;
  rooms: { room_type: RoomType; price_zmw: number }[];
};

/** A published place (listing_cards is the published-only gate) and its room prices. */
export async function placeForApply(supabase: Client, listingId: string): Promise<PlaceForApply | null> {
  if (!isUuid(listingId)) return null;
  const { data: card, error } = await supabase
    .from("listing_cards")
    .select("id, name, area, type, gender, rent_unit")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw error;
  if (!card?.id) return null;
  const { data: rooms, error: rErr } = await supabase.from("rooms").select("room_type, price_zmw").eq("listing_id", listingId);
  if (rErr) throw rErr;
  return {
    id: card.id,
    name: card.name ?? "This place",
    area: card.area,
    type: card.type,
    gender: card.gender,
    rentUnit: card.rent_unit,
    rooms: (rooms ?? []).map((r) => ({ room_type: r.room_type, price_zmw: Number(r.price_zmw) })),
  };
}

/** The database's own check (auth.users.email_confirmed_at). The session token does not carry it. */
export async function emailVerified(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase.rpc("email_verified");
  if (error) throw error;
  return data === true;
}

// ---------------------------------------------------------------- dashboard and notifications

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function myNotifications(
  supabase: Client,
  studentId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> {
  let q = supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("recipient_id", studentId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function unreadCount(supabase: Client, studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", studentId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function shortlistCount(supabase: Client, studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from("shortlist")
    .select("listing_id", { count: "exact", head: true })
    .eq("student_id", studentId);
  if (error) throw error;
  return count ?? 0;
}
