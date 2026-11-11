/**
 * Listing search filters. Everything lives in the URL so a search can be shared and the back button works.
 *
 * parseListingFilters  URL search params -> validated filters (bad values are dropped, never thrown)
 * filtersToParams      filters -> URL search params (the reverse; used for links)
 * roomMatchFor         filters -> the room-level match needed when a room type AND a budget are both set (or null)
 * roomQueryPlan        room match -> filters for the rooms table (the listing ids it returns feed the next step)
 * listingQueryPlan     filters -> a plain description of the database query (filters, order, page range)
 *
 * The plans are applied by src/server/listings.ts. They are plain data so they can be unit tested without a
 * database. All filtering happens in the database, never in the browser.
 */
import {
  GENDERS,
  LISTING_TYPES,
  ROOM_TYPES,
  FACILITY_KEYS,
  type GenderPolicy,
  type ListingType,
  type RoomType,
} from "./labels";

export const PAGE_SIZE = 12;
export const MAX_BUDGET = 100_000;
const MAX_PAGE = 1000;

export const SORTS = ["best", "price", "distance", "updated"] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = {
  best: "Best match",
  price: "Price: low to high",
  distance: "Distance to campus",
  updated: "Recently updated",
};

export type ViewMode = "grid" | "list";

export type ListingFilters = {
  institution: string | null; // institution code, for example UNZA
  area: string | null;
  min: number | null; // monthly budget, kwacha (compared as stored; hostels are per term)
  max: number | null;
  types: ListingType[];
  rooms: RoomType[];
  genders: GenderPolicy[];
  facilities: string[];
  freeOnly: boolean;
  hideStale: boolean;
  sort: Sort;
  view: ViewMode;
  page: number;
};

export const EMPTY_FILTERS: ListingFilters = {
  institution: null,
  area: null,
  min: null,
  max: null,
  types: [],
  rooms: [],
  genders: [],
  facilities: [],
  freeOnly: false,
  hideStale: false,
  sort: "best",
  view: "grid",
  page: 1,
};

/** Budget bands offered by the home page search form. */
export const BUDGET_BANDS = [
  { value: "0-1500", label: "Up to K1,500" },
  { value: "1500-2500", label: "K1,500 to K2,500" },
  { value: "2500-", label: "K2,500 and above" },
] as const;

export type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

/** All values of a key. Accepts repeated keys (?type=a&type=b) and comma lists (?type=a,b). */
function all(params: RawParams, key: string): string[] {
  const raw = params instanceof URLSearchParams ? params.getAll(key) : ([] as string[]).concat(params[key] ?? []);
  return raw.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

function one(params: RawParams, key: string): string | null {
  return all(params, key)[0] ?? null;
}

function oneOf<T extends string>(allowed: readonly T[], values: string[]): T[] {
  const set = new Set<T>();
  for (const v of values) if ((allowed as readonly string[]).includes(v)) set.add(v as T);
  return allowed.filter((a) => set.has(a)); // stable order, no duplicates
}

function money(value: string | null): number | null {
  if (value === null || value === "") return null;
  if (!/^\d{1,7}$/.test(value)) return null;
  const n = Number(value);
  return n <= MAX_BUDGET ? n : null;
}

function flag(value: string | null): boolean {
  return value === "1" || value === "true" || value === "on";
}

const INSTITUTION_CODE = /^[A-Z][A-Z0-9]{1,15}$/;

export function parseListingFilters(params: RawParams): ListingFilters {
  const f: ListingFilters = { ...EMPTY_FILTERS };

  const inst = one(params, "institution")?.toUpperCase() ?? null;
  f.institution = inst && INSTITUTION_CODE.test(inst) ? inst : null;

  const area = one(params, "area");
  f.area = area && area.length <= 60 ? area : null;

  f.min = money(one(params, "min"));
  f.max = money(one(params, "max"));
  const band = one(params, "budget");
  if (band && f.min === null && f.max === null) {
    const m = /^(\d{1,7})-(\d{1,7})?$/.exec(band);
    if (m) {
      f.min = money(m[1]) || null;
      f.max = m[2] ? money(m[2]) : null;
    }
  }
  if (f.min !== null && f.max !== null && f.min > f.max) [f.min, f.max] = [f.max, f.min];

  f.types = oneOf(LISTING_TYPES, all(params, "type"));
  f.rooms = oneOf(ROOM_TYPES, all(params, "room"));
  f.genders = oneOf(GENDERS, all(params, "gender"));
  f.facilities = oneOf(FACILITY_KEYS, all(params, "facilities"));
  f.freeOnly = flag(one(params, "free"));
  f.hideStale = flag(one(params, "fresh"));

  const sort = one(params, "sort");
  f.sort = (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "best";
  f.view = one(params, "view") === "list" ? "list" : "grid";

  const page = Number(one(params, "page"));
  f.page = Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
  return f;
}

/** Distance sort needs an institution. Without one we fall back to best match and say so on the page. */
export function effectiveSort(f: ListingFilters): { sort: Sort; distanceNeedsInstitution: boolean } {
  if (f.sort === "distance" && !f.institution) return { sort: "best", distanceNeedsInstitution: true };
  return { sort: f.sort, distanceNeedsInstitution: false };
}

/** The reverse of parseListingFilters. Defaults are left out so URLs stay short. */
export function filtersToParams(f: ListingFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.institution) p.set("institution", f.institution);
  if (f.area) p.set("area", f.area);
  if (f.min !== null) p.set("min", String(f.min));
  if (f.max !== null) p.set("max", String(f.max));
  f.types.forEach((v) => p.append("type", v));
  f.rooms.forEach((v) => p.append("room", v));
  f.genders.forEach((v) => p.append("gender", v));
  f.facilities.forEach((v) => p.append("facilities", v));
  if (f.freeOnly) p.set("free", "1");
  if (f.hideStale) p.set("fresh", "1");
  if (f.sort !== "best") p.set("sort", f.sort);
  if (f.view !== "grid") p.set("view", f.view);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

export function listingsHref(f: ListingFilters, changes: Partial<ListingFilters> = {}): string {
  const qs = filtersToParams({ ...f, ...changes }).toString();
  return qs ? `/listings?${qs}` : "/listings";
}

/** True when any filter that narrows the results is set (sort, view and page do not count). */
/**
 * The canonical /listings address for a query string, or null when it is already canonical.
 * Used by src/proxy.ts to redirect before the page starts streaming (a real 307, not a client-side redirect).
 */
export function canonicalListingsUrl(search: URLSearchParams): string | null {
  const canonical = filtersToParams(parseListingFilters(search)).toString();
  if (canonical === search.toString()) return null;
  return canonical ? `/listings?${canonical}` : "/listings";
}

export function hasActiveFilters(f: ListingFilters): boolean {
  return (
    f.institution !== null ||
    f.area !== null ||
    f.min !== null ||
    f.max !== null ||
    f.types.length + f.rooms.length + f.genders.length + f.facilities.length > 0 ||
    f.freeOnly ||
    f.hideStale
  );
}

// ---------------------------------------------------------------- query plan

export type FilterOp =
  | { op: "eq"; column: string; value: string | boolean }
  | { op: "gt" | "gte" | "lte"; column: string; value: number }
  | { op: "in"; column: string; value: string[] }
  | { op: "contains" | "overlaps"; column: string; value: string[] }
  | { op: "notNull"; column: string };

export type OrderOp = { column: string; ascending: boolean; nullsFirst: boolean };

export type QueryPlan = { filters: FilterOp[]; order: OrderOp[]; from: number; to: number };

/** Ordering that keeps paging stable: every sort ends with the id. */
function orderFor(sort: Sort, institution: string | null): OrderOp[] {
  const id: OrderOp = { column: "id", ascending: true, nullsFirst: false };
  switch (sort) {
    case "price":
      return [{ column: "price_from", ascending: true, nullsFirst: false }, id];
    case "distance":
      return [{ column: `distances->${institution}`, ascending: true, nullsFirst: false }, id];
    case "updated":
      return [{ column: "last_updated_at", ascending: false, nullsFirst: false }, id];
    case "best":
    default:
      // Best match: most free beds, then most recently updated.
      return [
        { column: "beds_available", ascending: false, nullsFirst: false },
        { column: "last_updated_at", ascending: false, nullsFirst: false },
        id,
      ];
  }
}

/**
 * Room type and budget together must be met by ONE room: "double, up to K1,500" needs a double room priced at
 * K1,500 or less. The listing_cards columns cannot say that (price_from may come from a cheap triple), so in that
 * case the search first finds the matching rooms and then shows only their listings.
 * With "only free beds" ticked as well, the free bed must be in that same room.
 */
export type RoomMatch = { roomTypes: RoomType[]; min: number | null; max: number | null; freeBedsOnly: boolean };

export function roomMatchFor(f: ListingFilters): RoomMatch | null {
  if (!f.rooms.length || (f.min === null && f.max === null)) return null;
  return { roomTypes: [...f.rooms], min: f.min, max: f.max, freeBedsOnly: f.freeOnly };
}

/** Filters for the rooms table. "beds.state" filters the room's embedded beds (an inner join when used). */
export function roomQueryPlan(m: RoomMatch): FilterOp[] {
  // TODO(OD): hostel prices are per term and are compared as stored. The term length is an open decision.
  const ops: FilterOp[] = [{ op: "in", column: "room_type", value: [...m.roomTypes] }];
  if (m.max !== null) ops.push({ op: "lte", column: "price_zmw", value: m.max });
  if (m.min !== null) ops.push({ op: "gte", column: "price_zmw", value: m.min });
  if (m.freeBedsOnly) ops.push({ op: "eq", column: "beds.state", value: "available" });
  return ops;
}

export type PlanOptions = {
  pageSize?: number;
  /** Listing ids found with roomQueryPlan. Required when roomMatchFor(filters) is not null. */
  roomListingIds?: readonly string[];
};

export function listingQueryPlan(f: ListingFilters, opts: PlanOptions = {}): QueryPlan {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const filters: FilterOp[] = [];
  const roomMatch = roomMatchFor(f);
  if (roomMatch && !opts.roomListingIds) throw new Error("listingQueryPlan: room type with a budget needs roomListingIds");

  // Institution: places that list a distance to that campus.
  if (f.institution) filters.push({ op: "notNull", column: `distances->${f.institution}` });
  if (f.area) filters.push({ op: "eq", column: "area", value: f.area });

  if (roomMatch) {
    // Room type and budget (and the free bed, when asked) were matched room by room. Keep only those listings.
    filters.push({ op: "in", column: "id", value: [...new Set(opts.roomListingIds)] });
  } else {
    // Budget alone: the listing's price range overlaps the budget range.
    // TODO(OD): hostel prices are per term and are compared as stored. The term length is an open decision.
    if (f.max !== null) filters.push({ op: "lte", column: "price_from", value: f.max });
    if (f.min !== null) filters.push({ op: "gte", column: "price_to", value: f.min });
    // Room type alone: any of the chosen types. With "only free beds", that type must have a free bed.
    if (f.rooms.length) {
      filters.push({ op: "overlaps", column: f.freeOnly ? "free_room_types" : "room_types", value: [...f.rooms] });
    }
  }

  if (f.types.length) filters.push({ op: "in", column: "type", value: [...f.types] });
  if (f.genders.length) filters.push({ op: "in", column: "gender", value: [...f.genders] });
  if (f.facilities.length) filters.push({ op: "contains", column: "facilities", value: [...f.facilities] });
  if (f.freeOnly) filters.push({ op: "gt", column: "beds_available", value: 0 });
  if (f.hideStale) filters.push({ op: "eq", column: "is_stale", value: false });

  const { sort } = effectiveSort(f);
  const from = (f.page - 1) * pageSize;
  return { filters, order: orderFor(sort, f.institution), from, to: from + pageSize - 1 };
}

export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Page links to show: first, last, and one either side of the current page, with gaps between. */
export function pageNumbers(current: number, total: number): (number | "gap")[] {
  const keep = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
