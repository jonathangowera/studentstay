/** Bed counts by state, for the owner dashboard and the system overview. Pure and unit tested. */
import { BED_STATES, type BedState } from "./labels";
import type { Parsed } from "@/lib/validation";
import { allowedMoves, type TransitionRow } from "@/lib/transitions";

export type BedCounts = Record<BedState, number>;

const KEYS = BED_STATES.map((b) => b.state);

export function emptyBedCounts(): BedCounts {
  return Object.fromEntries(KEYS.map((k) => [k, 0])) as BedCounts;
}

export function countBeds(states: readonly string[]): BedCounts {
  const out = emptyBedCounts();
  for (const s of states) if ((KEYS as readonly string[]).includes(s)) out[s as BedState] += 1;
  return out;
}

export function addBedCounts(a: BedCounts, b: BedCounts): BedCounts {
  const out = emptyBedCounts();
  for (const k of KEYS) out[k] = a[k] + b[k];
  return out;
}

export function totalBeds(c: BedCounts): number {
  return KEYS.reduce((n, k) => n + c[k], 0);
}

/** Reserved plus occupied: the beds students have a booking for. */
export function bookedBeds(c: BedCounts): number {
  return c.reserved + c.occupied;
}


/**
 * The only bed changes an owner is offered (agreed for the demo). Held and pending approval beds belong to an
 * application, and held, pending approval and reserved are never offered as a new state: those come from decisions.
 */
export const OWNER_BED_MOVES: readonly { from: BedState; to: BedState; label: string }[] = [
  { from: "available", to: "blocked_for_maintenance", label: "Block for maintenance" },
  { from: "blocked_for_maintenance", to: "available", label: "Mark available" },
  { from: "reserved", to: "occupied", label: "Mark occupied (moved in)" },
  { from: "occupied", to: "available", label: "Mark available (moved out)" },
];

/** States owned by an application. The owner sees "Set by an application" instead of any change. */
export const APPLICATION_STATES: readonly BedState[] = ["held", "pending_approval"];

/** The agreed moves from this state that state_transitions also allows. */
export function ownerBedMoves(rows: readonly TransitionRow[], from: BedState): { to: BedState; label: string }[] {
  if (APPLICATION_STATES.includes(from)) return [];
  const allowed = allowedMoves(rows, "bed", from);
  return OWNER_BED_MOVES.filter((m) => m.from === from && allowed.includes(m.to)).map(({ to, label }) => ({ to, label }));
}

type FormLike = { get(name: string): unknown };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const BED_NOTE_MAX = 300;
export const PRICE_MAX = 100000;

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function parseBedChange(form: FormLike): Parsed<{ listingId: string; bedId: string; to: BedState; note: string | null }> {
  const listingId = text(form, "listing_id");
  const bedId = text(form, "bed_id");
  const to = text(form, "to");
  const note = text(form, "note");
  if (!UUID.test(listingId) || !UUID.test(bedId)) return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  if (!OWNER_BED_MOVES.some((m) => m.to === to)) return { ok: false, errors: { to: "Choose the new state." } };
  if (note.length > BED_NOTE_MAX) return { ok: false, errors: { note: `Use ${BED_NOTE_MAX} characters or fewer.` } };
  return { ok: true, data: { listingId, bedId, to: to as BedState, note: note || null } };
}

/** A room price in kwacha: a whole number or up to two decimals, 0 to K100,000. Commas are allowed. */
export function parsePrice(form: FormLike): Parsed<{ listingId: string; roomId: string; price: number }> {
  const listingId = text(form, "listing_id");
  const roomId = text(form, "room_id");
  const raw = text(form, "price").replace(/,/g, "").replace(/^K/i, "");
  if (!UUID.test(listingId) || !UUID.test(roomId)) return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { ok: false, errors: { price: "Enter an amount in kwacha, for example 1350." } };
  const price = Number(raw);
  if (price > PRICE_MAX) return { ok: false, errors: { price: "Enter K100,000 or less." } };
  return { ok: true, data: { listingId, roomId, price } };
}
