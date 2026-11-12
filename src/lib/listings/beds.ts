/** Bed counts by state, for the owner dashboard and the system overview. Pure and unit tested. */
import { BED_STATES, type BedState } from "./labels";

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
