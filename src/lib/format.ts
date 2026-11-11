/**
 * Display formatting for money, distance and time. Pure functions, unit tested.
 * Currency is kwacha written like K1,350. Times are shown in Central Africa Time (Africa/Lusaka, UTC+2).
 */

export const TIME_ZONE = "Africa/Lusaka";

const KWACHA = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 1350 -> "K1,350". 1350.5 -> "K1,350.50". */
export function formatKwacha(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const text = Number.isInteger(n) ? KWACHA.format(n) : n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `K${text}`;
}

export type RentUnit = "month" | "term";

/** "per month" or "per term". Hostels are priced per term. */
export function perUnit(unit: string | null | undefined): string {
  return unit === "term" ? "per term" : "per month";
}

/**
 * The price line on cards and the details page.
 * One price: "K1,350 per month". A range: "K1,350 to K2,400 per month". No rooms: "Price not listed".
 */
export function priceRange(from: number | null, to: number | null, unit: string | null | undefined): string {
  if (from === null || from === undefined) return "Price not listed";
  const start = formatKwacha(from);
  if (to === null || to === undefined || Number(to) === Number(from)) return `${start} ${perUnit(unit)}`;
  return `${start} to ${formatKwacha(to)} ${perUnit(unit)}`;
}

/** 1.1 -> "1.1 km". */
export function formatKm(km: number | string | null | undefined): string {
  const n = typeof km === "string" ? Number(km) : km;
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return `${n.toFixed(1)} km`;
}

/** (1.1, "UNZA") -> "1.1 km to UNZA". */
export function formatDistance(km: number | string, place: string): string {
  return `${formatKm(km)} to ${place}`;
}

/** The calendar date in Lusaka, as YYYY-MM-DD. */
function lusakaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Whole calendar days between the two moments, counted in Central Africa Time. Never negative. */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const a = Date.parse(lusakaDate(then));
  const b = Date.parse(lusakaDate(now));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** "Updated today", "Updated 1 day ago", "Updated 12 days ago". */
export function formatUpdated(iso: string, now: Date = new Date()): string {
  const days = daysSince(iso, now);
  if (days === 0) return "Updated today";
  return `Updated ${days} ${days === 1 ? "day" : "days"} ago`;
}

/** Shown when listing_cards.is_stale is true. */
export function staleNote(iso: string, now: Date = new Date()): string {
  const days = daysSince(iso, now);
  return `Not updated for ${days} ${days === 1 ? "day" : "days"}. Confirm availability before applying.`;
}

/** "11 Nov 2026, 14:05 CAT". Used in tooltips and <time> titles. */
export function formatDateTimeCAT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${text} CAT`;
}

/** "1 place", "8 places". */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
