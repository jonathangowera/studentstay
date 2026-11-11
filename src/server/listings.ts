import "server-only";

/**
 * Public listing reads for slice S3. Every query runs as the visitor (publishable key + their session, if any),
 * so row-level security applies. No service role here.
 *
 * Rules (docs/database-reference.md):
 * - Always name the columns on listings, rooms and beds. Never select('*').
 * - Public pages only show published listings. listing_cards only contains published listings, so it is the gate:
 *   a listing that is not in listing_cards is "not found", even for its owner who could otherwise read the draft.
 */
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { reportError } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { listingQueryPlan, type ListingFilters, type QueryPlan } from "@/lib/listings/filters";
import { isUuid } from "@/lib/listings/compare";
import type { BedState, RoomType } from "@/lib/listings/labels";

type Client = SupabaseClient<Database>;

/** The listing_cards columns the cards and pages use. */
export const CARD_COLUMNS =
  "id, name, type, area, gender, gender_note, facilities, rent_unit, verification, last_updated_at, is_stale, managed_by, price_from, price_to, beds_total, beds_available, distances" as const;

type CardRow = Database["public"]["Views"]["listing_cards"]["Row"];
/** View columns are all nullable in the generated types. The id is always there. */
export type ListingCardData = Pick<
  CardRow,
  | "name"
  | "type"
  | "area"
  | "gender"
  | "gender_note"
  | "facilities"
  | "rent_unit"
  | "verification"
  | "last_updated_at"
  | "is_stale"
  | "managed_by"
  | "price_from"
  | "price_to"
  | "beds_total"
  | "beds_available"
  | "distances"
> & { id: string };

function withId<T extends { id: string | null }>(rows: T[] | null): (T & { id: string })[] {
  return (rows ?? []).filter((r): r is T & { id: string } => typeof r.id === "string");
}

/**
 * The query builder methods we use, loosely typed. The plan is built from validated filters, but its column names
 * include JSON paths (distances->UNZA) that the generated types cannot describe.
 */
type Chain = {
  eq(column: string, value: unknown): Chain;
  gt(column: string, value: unknown): Chain;
  gte(column: string, value: unknown): Chain;
  lte(column: string, value: unknown): Chain;
  in(column: string, values: readonly unknown[]): Chain;
  contains(column: string, value: readonly unknown[]): Chain;
  overlaps(column: string, value: readonly unknown[]): Chain;
  not(column: string, operator: string, value: unknown): Chain;
  order(column: string, options: { ascending: boolean; nullsFirst: boolean }): Chain;
  range(from: number, to: number): Chain;
};

export function applyPlan<Q>(query: Q, plan: QueryPlan): Q {
  let q = query as unknown as Chain;
  for (const f of plan.filters) {
    switch (f.op) {
      case "eq":
        q = q.eq(f.column, f.value);
        break;
      case "gt":
        q = q.gt(f.column, f.value);
        break;
      case "gte":
        q = q.gte(f.column, f.value);
        break;
      case "lte":
        q = q.lte(f.column, f.value);
        break;
      case "in":
        q = q.in(f.column, f.value);
        break;
      case "contains":
        q = q.contains(f.column, f.value);
        break;
      case "overlaps":
        q = q.overlaps(f.column, f.value);
        break;
      case "notNull":
        q = q.not(f.column, "is", null);
        break;
    }
  }
  for (const o of plan.order) q = q.order(o.column, { ascending: o.ascending, nullsFirst: o.nullsFirst });
  q = q.range(plan.from, plan.to);
  return q as unknown as Q;
}

export type SearchResult = { rows: ListingCardData[]; total: number; ms: number };

/** One round trip: filtered, sorted, paged rows plus the exact total. */
export async function searchListings(filters: ListingFilters, client?: Client): Promise<SearchResult> {
  const supabase = client ?? (await createClient());
  const started = performance.now();
  const base = supabase.from("listing_cards").select(CARD_COLUMNS, { count: "exact" });
  const { data, count, error } = await applyPlan(base, listingQueryPlan(filters));
  const ms = Math.round(performance.now() - started);
  if (error) throw error;
  return { rows: withId(data), total: count ?? 0, ms };
}

/** Home page: published, with free beds, most recently updated first. */
export async function featuredListings(limit = 4): Promise<ListingCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_cards")
    .select(CARD_COLUMNS)
    .gt("beds_available", 0)
    .order("last_updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return withId(data);
}

export async function cardsByIds(ids: readonly string[]): Promise<ListingCardData[]> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("listing_cards").select(CARD_COLUMNS).in("id", valid);
  if (error) throw error;
  return withId(data);
}

export type Institution = { code: string; name: string; status: string };

export async function institutions(): Promise<Institution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("institutions").select("code, name, status").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Areas that have at least one published listing, for the home search. */
export async function listingAreas(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listing_cards").select("area").order("area");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.area).filter((a): a is string => !!a))];
}

// ---------------------------------------------------------------- one listing

export type RoomWithBeds = {
  id: string;
  room_number: string;
  room_type: RoomType;
  capacity: number;
  price_zmw: number;
  wing: string | null;
  floor: number | null;
  gender: Database["public"]["Enums"]["gender_policy"] | null;
  beds: { id: string; label: string; state: BedState }[];
};

export type ListingDetail = {
  card: ListingCardData;
  listing: {
    id: string;
    institution_id: string | null;
    address: string | null;
    description: string | null;
    house_rules: string | null;
    deposit_note: string | null;
    min_stay_note: string | null;
  };
  rooms: RoomWithBeds[];
  distances: { code: string; name: string; km: number; partnered: boolean }[];
};

/** Null when the id is not a published listing. Cached for one request (page and metadata share it). */
export const listingDetail = cache(async (id: string): Promise<ListingDetail | null> => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();

  const [cardRes, listingRes, roomsRes, distRes] = await Promise.all([
    supabase.from("listing_cards").select(CARD_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("listings")
      .select("id, institution_id, address, description, house_rules, deposit_note, min_stay_note")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("rooms")
      .select("id, room_number, room_type, capacity, price_zmw, wing, floor, gender, beds(id, label, state)")
      .eq("listing_id", id)
      .order("room_number"),
    supabase
      .from("listing_distances")
      .select("distance_km, partnered, institutions(code, name)")
      .eq("listing_id", id),
  ]);

  for (const r of [cardRes, listingRes, roomsRes, distRes]) if (r.error) throw r.error;
  const card = cardRes.data;
  if (!card?.id || !listingRes.data) return null;

  const rooms: RoomWithBeds[] = (roomsRes.data ?? []).map((r) => ({
    ...r,
    price_zmw: Number(r.price_zmw),
    beds: [...(r.beds ?? [])].sort((a, b) => a.label.localeCompare(b.label)),
  }));

  const distances = (distRes.data ?? [])
    .filter((d) => d.institutions)
    .map((d) => ({
      code: d.institutions!.code,
      name: d.institutions!.name,
      km: Number(d.distance_km),
      partnered: d.partnered,
    }))
    .sort((a, b) => a.km - b.km);

  return { card: { ...card, id: card.id }, listing: listingRes.data, rooms, distances };
});

/** Room types offered by each listing, with their price range, for the compare page. */
export async function roomTypesFor(ids: readonly string[]): Promise<Map<string, { type: RoomType; from: number; to: number; free: number }[]>> {
  const out = new Map<string, { type: RoomType; from: number; to: number; free: number }[]>();
  const valid = ids.filter(isUuid);
  if (!valid.length) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("listing_id, room_type, price_zmw, beds(state)")
    .in("listing_id", valid);
  if (error) throw error;
  for (const r of data ?? []) {
    const list = out.get(r.listing_id) ?? [];
    const price = Number(r.price_zmw);
    const free = (r.beds ?? []).filter((b) => b.state === "available").length;
    const found = list.find((x) => x.type === r.room_type);
    if (found) {
      found.from = Math.min(found.from, price);
      found.to = Math.max(found.to, price);
      found.free += free;
    } else list.push({ type: r.room_type, from: price, to: price, free });
    out.set(r.listing_id, list);
  }
  return out;
}

// ---------------------------------------------------------------- shortlist

/**
 * Which of these listings the signed-in student has saved. Empty for anyone else.
 * Never fails the page: if the shortlist cannot be read, hearts show as not saved and the error is logged.
 */
export async function savedListingIds(studentId: string | null, ids?: readonly string[]): Promise<Set<string>> {
  if (!studentId) return new Set();
  try {
    const supabase = await createClient();
    let q = supabase.from("shortlist").select("listing_id").eq("student_id", studentId);
    if (ids) {
      const valid = ids.filter(isUuid);
      if (!valid.length) return new Set();
      q = q.in("listing_id", valid);
    }
    const { data, error } = await q;
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.listing_id));
  } catch (err) {
    unstable_rethrow(err);
    reportError("load saved listings", err);
    return new Set();
  }
}

export async function shortlistFor(studentId: string): Promise<{ listing_id: string; created_at: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shortlist")
    .select("listing_id, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
