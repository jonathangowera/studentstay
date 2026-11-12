import "server-only";

/**
 * Loads the room pool for one institution, for the engine. Runs with the service role, and only after
 * src/server/allocation/run.ts has checked the administrator's own access. One query, every column named.
 *
 * Pool: every room of every PUBLISHED listing that is partnered with the institution (listing_distances.partnered).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { EngineRoom } from "@/lib/allocation/types";

type Client = SupabaseClient<Database>;

const POOL_SELECT =
  "distance_km, partnered, listings!inner(id, name, rent_unit, gender, facilities, last_updated_at, moderation, rooms(id, room_number, room_type, price_zmw, wing, gender, beds(id, label, state, held_for_application_id)))" as const;

type PoolRow = {
  distance_km: number | string;
  partnered: boolean;
  listings: {
    id: string;
    name: string;
    rent_unit: string;
    gender: EngineRoom["gender"];
    facilities: string[] | null;
    last_updated_at: string;
    moderation: string;
    rooms: {
      id: string;
      room_number: string;
      room_type: EngineRoom["type"];
      price_zmw: number | string;
      wing: string | null;
      gender: EngineRoom["gender"];
      beds: { id: string; label: string; state: EngineRoom["beds"][number]["state"]; held_for_application_id: string | null }[];
    }[];
  };
};

/** Turns the nested rows into engine rooms. Pure, exported for tests. */
export function toEngineRooms(rows: readonly PoolRow[]): EngineRoom[] {
  return rows.flatMap((d) => {
    const l = d.listings;
    if (!l || l.moderation !== "published") return [];
    const listing = {
      id: l.id,
      name: l.name,
      rentUnit: l.rent_unit,
      gender: l.gender,
      facilities: l.facilities ?? [],
      lastUpdatedAt: l.last_updated_at,
      distanceKm: d.distance_km === null ? null : Number(d.distance_km),
      partnered: d.partnered,
    };
    return (l.rooms ?? []).map((r) => ({
      id: r.id,
      number: r.room_number,
      type: r.room_type,
      price: Number(r.price_zmw),
      wing: r.wing,
      gender: r.gender,
      listing,
      beds: (r.beds ?? []).map((b) => ({ id: b.id, label: b.label, state: b.state, heldForApplicationId: b.held_for_application_id })),
    }));
  });
}

export async function loadPool(admin: Client, institutionId: string): Promise<EngineRoom[]> {
  const { data, error } = await admin
    .from("listing_distances")
    .select(POOL_SELECT)
    .eq("institution_id", institutionId)
    .eq("partnered", true)
    .eq("listings.moderation", "published");
  if (error) throw error;
  return toEngineRooms((data ?? []) as unknown as PoolRow[]);
}
