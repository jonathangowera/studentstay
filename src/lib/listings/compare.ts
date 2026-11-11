/** Compare up to three listings. Pure helpers shared by the compare page and the compare checkboxes. */

export const MAX_COMPARE = 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

export type ParsedCompareIds = {
  ids: string[];
  /** More than three valid ids were given. Only the first three are used. */
  tooMany: boolean;
  /** Some values were not listing ids and were ignored. */
  invalid: boolean;
};

/** Reads ?ids=a,b,c (or repeated ?ids=). Keeps order, drops duplicates and bad values, stops at three. */
export function parseCompareIds(raw: string | string[] | null | undefined): ParsedCompareIds {
  const values = ([] as string[])
    .concat(raw ?? [])
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  let invalid = false;
  for (const v of values) {
    if (!isUuid(v)) invalid = true;
    else if (!valid.includes(v)) valid.push(v);
  }
  return { ids: valid.slice(0, MAX_COMPARE), tooMany: valid.length > MAX_COMPARE, invalid };
}

export type ToggleResult = { selected: string[]; blocked: boolean };

/** Adds or removes one id. Adding a fourth is blocked and the selection is unchanged. */
export function toggleCompare(selected: readonly string[], id: string, on: boolean): ToggleResult {
  const current = selected.filter((s, i) => selected.indexOf(s) === i);
  if (!on) return { selected: current.filter((s) => s !== id), blocked: false };
  if (current.includes(id)) return { selected: current, blocked: false };
  if (current.length >= MAX_COMPARE) return { selected: current, blocked: true };
  return { selected: [...current, id], blocked: false };
}

export const COMPARE_LIMIT_MESSAGE = `You can compare up to ${MAX_COMPARE} places. Remove one to add another.`;

export function compareHref(ids: readonly string[], institution?: string | null): string {
  const p = new URLSearchParams();
  if (ids.length) p.set("ids", ids.join(","));
  if (institution) p.set("institution", institution);
  const qs = p.toString();
  return qs ? `/compare?${qs}` : "/compare";
}

/** Ids of the rows with the lowest starting price. Ties are all marked. Empty when no row has a price. */
export function lowestPriceIds(rows: readonly { id: string; price_from: number | null }[]): string[] {
  const priced = rows.filter((r) => r.price_from !== null && Number.isFinite(Number(r.price_from)));
  if (priced.length < 2) return [];
  const min = Math.min(...priced.map((r) => Number(r.price_from)));
  return priced.filter((r) => Number(r.price_from) === min).map((r) => r.id);
}

/** Ids of the rows nearest to the institution. Ties are all marked. Empty without an institution. */
export function nearestIds(rows: readonly { id: string; km: number | null }[]): string[] {
  const known = rows.filter((r) => r.km !== null && Number.isFinite(r.km));
  if (known.length < 2) return [];
  const min = Math.min(...known.map((r) => r.km as number));
  return known.filter((r) => r.km === min).map((r) => r.id);
}
