/** Groups rooms by room type for the details, availability and compare pages. Pure, unit tested.
 * Room types are always listed in ROOM_TYPES order: single, double, triple, quad. */
import { ROOM_TYPES, type BedState, type RoomType } from "./labels";

export type RoomInput = {
  room_type: RoomType;
  price_zmw: number;
  wing: string | null;
  floor: number | null;
  beds: { state: BedState }[];
};

export type RoomTypeSummary = {
  type: RoomType;
  rooms: number;
  bedsTotal: number;
  free: number;
  /** Held for an applicant or waiting for approval. These may come back if the hold ends. */
  setAside: number;
  priceFrom: number;
  priceTo: number;
  note: string;
};

export function floorLabel(floor: number): string {
  return floor === 0 ? "Ground floor" : `Floor ${floor}`;
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A short plain note: where the rooms are, and whether held beds may come back. */
export function roomTypeNote(rooms: RoomInput[], free: number, setAside: number): string {
  const parts: string[] = [];
  const floors = [...new Set(rooms.map((r) => r.floor).filter((f): f is number => f !== null))].sort((a, b) => a - b);
  if (floors.length === 1) parts.push(floorLabel(floors[0]));
  else if (floors.length > 1) parts.push(`Floors ${listWords(floors.map((f) => (f === 0 ? "ground" : String(f))))}`);
  const wings = [...new Set(rooms.map((r) => r.wing).filter((w): w is string => !!w))].sort();
  if (wings.length) parts.push(listWords(wings));
  const where = parts.join(", ");
  if (free === 0 && setAside > 0) return [where, "Held beds may return if a hold ends"].filter(Boolean).join(". ");
  if (free === 0) return [where, "All beds are taken"].filter(Boolean).join(". ");
  return where;
}

export function summariseRoomTypes(rooms: RoomInput[]): RoomTypeSummary[] {
  return ROOM_TYPES.flatMap((type) => {
    const ofType = rooms.filter((r) => r.room_type === type);
    if (!ofType.length) return [];
    const beds = ofType.flatMap((r) => r.beds);
    const free = beds.filter((b) => b.state === "available").length;
    const setAside = beds.filter((b) => b.state === "held" || b.state === "pending_approval").length;
    const prices = ofType.map((r) => Number(r.price_zmw));
    return [
      {
        type,
        rooms: ofType.length,
        bedsTotal: beds.length,
        free,
        setAside,
        priceFrom: Math.min(...prices),
        priceTo: Math.max(...prices),
        note: roomTypeNote(ofType, free, setAside),
      },
    ];
  });
}

export type RoomTypeRange = { type: RoomType; from: number; to: number; free: number };

/**
 * Price range and free beds per room type, per listing, for the compare page.
 * Rows can arrive in any order; each listing's list comes back as single, double, triple, quad.
 */
export function roomTypeRangesByListing(
  rows: { listing_id: string; room_type: RoomType; price_zmw: number | string; beds: { state: string }[] | null }[],
): Map<string, RoomTypeRange[]> {
  const grouped = new Map<string, Map<RoomType, RoomTypeRange>>();
  for (const r of rows) {
    const byType = grouped.get(r.listing_id) ?? new Map<RoomType, RoomTypeRange>();
    const price = Number(r.price_zmw);
    const free = (r.beds ?? []).filter((b) => b.state === "available").length;
    const found = byType.get(r.room_type);
    if (found) {
      found.from = Math.min(found.from, price);
      found.to = Math.max(found.to, price);
      found.free += free;
    } else byType.set(r.room_type, { type: r.room_type, from: price, to: price, free });
    grouped.set(r.listing_id, byType);
  }
  const out = new Map<string, RoomTypeRange[]>();
  for (const [id, byType] of grouped) {
    out.set(id, ROOM_TYPES.flatMap((t) => (byType.has(t) ? [byType.get(t)!] : [])));
  }
  return out;
}
