/**
 * The allocation engine. Pure: data and rules in, ranked rooms and excluded rooms with reasons out.
 * No database, no clock (now is passed in), no personal details (PRD FR5.6).
 *
 * The engine only RECOMMENDS. The application ends at "Waiting for administrator approval"; only an administrator
 * calling decide_allocation turns a recommendation into an allocation.
 *
 * Rules: see "The allocation engine" in docs/database-reference.md.
 */
import { daysSince, formatKm, formatKwacha } from "@/lib/format";
import { FACILITIES, GENDER_LABEL, ROOM_TYPE_LABEL, type GenderPolicy } from "@/lib/listings/labels";
import { MAX_EXCLUDED, MAX_RANKED, TERM_MONTHS } from "./constants";
import {
  CONSTRAINT_ORDER,
  type CandidateRow,
  type EngineBed,
  type EngineInput,
  type EngineResult,
  type EngineRoom,
  type ExcludedRoom,
  type HardConstraintKey,
  type RankedRoom,
  type Scores,
} from "./types";

// ---------------------------------------------------------------- small helpers

/** Rounds half up without floating point surprises: round(99.625, 2) = 99.63. */
export function round(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(Number((x * f).toPrecision(12))) / f;
}

/** Natural order ("9" before "10"). One collator, reused: creating one per comparison is slow. */
const COLLATOR = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const naturally = (a: string, b: string) => COLLATOR.compare(a, b);

/** The price as a monthly figure. Term prices are divided by TERM_MONTHS. */
export function monthlyPrice(price: number, rentUnit: string | null): number {
  return rentUnit === "term" ? price / TERM_MONTHS : price;
}

/** The switched-on hard constraints. A missing or non-boolean flag counts as true. */
export function activeConstraints(hard: unknown): Record<HardConstraintKey, boolean> {
  const obj = hard && typeof hard === "object" && !Array.isArray(hard) ? (hard as Record<string, unknown>) : {};
  const out = {} as Record<HardConstraintKey, boolean>;
  for (const k of CONSTRAINT_ORDER) out[k] = obj[k] !== false;
  return out;
}

/** The bed to recommend in a room: one held or pending for THIS application, otherwise the lowest available label. */
export function bedFor(room: Pick<EngineRoom, "beds">, applicationId: string): EngineBed | null {
  const mine = room.beds.find((b) => (b.state === "held" || b.state === "pending_approval") && b.heldForApplicationId === applicationId);
  if (mine) return mine;
  const free = room.beds.filter((b) => b.state === "available").sort((a, b) => naturally(a.label, b.label));
  return free[0] ?? null;
}

/** The room's own policy if set, otherwise the listing's. */
export function effectiveGender(room: Pick<EngineRoom, "gender" | "listing">): GenderPolicy | null {
  return room.gender ?? room.listing.gender ?? null;
}

const genderText = (g: GenderPolicy | null) => (g ? GENDER_LABEL[g].toLowerCase() : "not stated");
const roomTypeText = (t: EngineRoom["type"]) => ROOM_TYPE_LABEL[t].toLowerCase();
const wholeKwacha = (n: number) => formatKwacha(Math.round(n));

// ---------------------------------------------------------------- scores

export function scoreRoomType(roomType: string, requested: string): number {
  return roomType === requested ? 100 : 40;
}

/** ratio <= 1: 100. 1 < ratio <= 1.2: 100 - (ratio - 1) * 250. Above 1.2: 0. */
export function scoreBudget(monthly: number, budget: number): number {
  if (!(budget > 0)) return 0;
  const ratio = monthly / budget;
  if (ratio <= 1) return 100;
  if (ratio <= 1.2) return round(100 - (ratio - 1) * 250, 1);
  return 0;
}

export function scoreDistance(km: number | null): number {
  if (km === null || !Number.isFinite(km)) return 0;
  return round(Math.max(0, 100 - 5 * km), 1);
}

export function scoreFacilities(listingFacilities: readonly string[], preferred: readonly string[]): number {
  const wanted = [...new Set(preferred)];
  if (!wanted.length) return 100;
  const has = wanted.filter((f) => listingFacilities.includes(f)).length;
  return round((100 * has) / wanted.length, 1);
}

/** Up to 7 days: 100. 8 to 30 days: 100 - (days - 7) * 40 / 23. Over 30 days: 30. */
export function scoreAvailability(days: number): number {
  if (days <= 7) return 100;
  if (days <= 30) return round(100 - ((days - 7) * 40) / 23, 1);
  return 30;
}

// ---------------------------------------------------------------- the check for one room

type Check = { ok: true; bed: EngineBed; monthly: number } | { ok: false; key: HardConstraintKey; reason: string };

function checkRoom(room: EngineRoom, input: EngineInput, on: Record<HardConstraintKey, boolean>): Check {
  const app = input.application;
  const bed = bedFor(room, app.id);
  const monthly = monthlyPrice(room.price, room.listing.rentUnit);
  const gender = effectiveGender(room);
  const fails: Record<HardConstraintKey, () => string | null> = {
    institution_eligible: () => (room.listing.partnered ? null : "Not recognised for your institution"),
    bed_free: () => (bed ? null : "No free bed in this room"),
    gender_policy: () => (gender === app.gender ? null : `Gender policy: ${genderText(gender)}`),
    room_type: () => (room.type === app.roomType ? null : `Room type not requested (${roomTypeText(room.type)} room)`),
    budget_ceiling: () => (monthly <= app.budget ? null : `Above your budget (${wholeKwacha(monthly)} a month)`),
  };
  for (const key of CONSTRAINT_ORDER) {
    if (!on[key]) continue;
    const reason = fails[key]();
    if (reason) return { ok: false, key, reason };
  }
  // A room with no free bed can never be recommended, even with bed_free switched off: there is no bed to hold.
  if (!bed) return { ok: false, key: "bed_free", reason: "No free bed in this room" };
  return { ok: true, bed, monthly };
}

// ---------------------------------------------------------------- explanations

function roomExplanation(r: Omit<RankedRoom, "explanation" | "rank">, input: EngineInput, days: number): string {
  const app = input.application;
  const room = r.room;
  const type = ROOM_TYPE_LABEL[room.type];
  const typePart = room.type === app.roomType ? `${type} room` : `${type} room (you asked for ${roomTypeText(app.roomType)})`;
  const term = room.listing.rentUnit === "term";
  const pricePart = `${term ? "about " : ""}${wholeKwacha(r.monthlyPrice)} a month`;
  const over = r.monthlyPrice - app.budget;
  const budgetPart = over <= 0 ? "within your budget" : `${wholeKwacha(over)} a month over your budget`;
  const distPart =
    room.listing.distanceKm === null ? `distance to ${app.institutionCode} not listed` : `${formatKm(room.listing.distanceKm)} to ${app.institutionCode}`;
  const wanted = [...new Set(app.facilities)];
  const has = wanted.filter((f) => room.listing.facilities.includes(f)).length;
  const facPart = wanted.length ? `Has ${has} of your ${wanted.length} preferred facilities.` : "You did not choose any facilities.";
  return `${typePart}, ${pricePart}, ${budgetPart}, ${distPart}. ${facPart} Listing updated ${days} ${days === 1 ? "day" : "days"} ago.`;
}

const REASON_LABEL: Record<HardConstraintKey, string> = {
  institution_eligible: "not recognised for the institution",
  bed_free: "no free bed",
  gender_policy: "gender policy",
  room_type: "room type",
  budget_ceiling: "above the budget",
};

const CONSTRAINT_LABEL: Record<HardConstraintKey, string> = {
  institution_eligible: "institution recognition",
  bed_free: "free bed",
  gender_policy: "gender policy",
  room_type: "room type",
  budget_ceiling: "budget ceiling",
};

const rooms = (n: number) => `${n} ${n === 1 ? "room" : "rooms"}`;

function runExplanation(
  input: EngineInput,
  on: Record<HardConstraintKey, boolean>,
  counts: { eligible: number; ranked: number; excluded: number },
  fails: Record<HardConstraintKey, number>,
): string {
  const { eligible, ranked, excluded } = counts;
  const w = input.rule.weights;
  const applied = CONSTRAINT_ORDER.filter((k) => on[k]).map((k) => CONSTRAINT_LABEL[k]);
  const off = CONSTRAINT_ORDER.filter((k) => !on[k]).map((k) => CONSTRAINT_LABEL[k]);
  const parts = [
    `Rule ${input.rule.name}, version ${input.rule.version}.`,
    applied.length ? `Hard constraints applied: ${applied.join(", ")}.` : "No hard constraints were applied.",
    off.length ? `Switched off: ${off.join(", ")}.` : null,
    `Weights: room type ${w.roomType}, budget ${w.budget}, distance ${w.distance}, facilities ${w.facilities}, availability ${w.availability}.`,
    `Hostel prices are shown per term and were converted to a monthly figure using ${TERM_MONTHS} months.`,
    `Considered ${rooms(input.rooms.length)}: ${eligible} eligible, ${ranked} ranked, ${excluded} excluded.`,
    `Only room type, budget, distance, facilities and availability were used to rank rooms.`,
  ];
  if (ranked === 0) {
    const counts = CONSTRAINT_ORDER.filter((k) => fails[k] > 0).map((k) => `${REASON_LABEL[k]}: ${rooms(fails[k])}`);
    parts.push(counts.length ? `No room passed the hard constraints. ${counts.join(", ")}.` : "There were no rooms to consider.");
  }
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- the engine

export function recommend(input: EngineInput): EngineResult {
  const on = activeConstraints(input.rule.hardConstraints);
  const w = input.rule.weights;
  const app = input.application;

  const eligible: Omit<RankedRoom, "rank">[] = [];
  const excluded: ExcludedRoom[] = [];
  const failCounts = Object.fromEntries(CONSTRAINT_ORDER.map((k) => [k, 0])) as Record<HardConstraintKey, number>;

  // Days since each listing was updated, worked out once per listing (date formatting is the slow part).
  const daysByListing = new Map<string, number>();
  const daysFor = (l: EngineRoom["listing"]) => {
    let d = daysByListing.get(l.id);
    if (d === undefined) daysByListing.set(l.id, (d = daysSince(l.lastUpdatedAt, input.now)));
    return d;
  };

  for (const room of input.rooms) {
    const check = checkRoom(room, input, on);
    if (!check.ok) {
      excluded.push({ room, reasonKey: check.key, reason: check.reason });
      failCounts[check.key]++;
      continue;
    }
    const days = daysFor(room.listing);
    const s = {
      roomType: scoreRoomType(room.type, app.roomType),
      budget: scoreBudget(check.monthly, app.budget),
      distance: scoreDistance(room.listing.distanceKm),
      facilities: scoreFacilities(room.listing.facilities, app.facilities),
      availability: scoreAvailability(days),
    };
    const total = round(
      (w.roomType * s.roomType + w.budget * s.budget + w.distance * s.distance + w.facilities * s.facilities + w.availability * s.availability) / 100,
      2,
    );
    const partial = { room, bed: check.bed, monthlyPrice: check.monthly, scores: { ...s, total } as Scores };
    eligible.push({ ...partial, explanation: roomExplanation(partial, input, days) });
  }

  eligible.sort(
    (a, b) => b.scores.total - a.scores.total || naturally(a.room.number, b.room.number) || naturally(a.bed.label, b.bed.label),
  );
  const ranked: RankedRoom[] = eligible.slice(0, MAX_RANKED).map((r, i) => ({ ...r, rank: i + 1 }));

  const order = new Map(CONSTRAINT_ORDER.map((k, i) => [k, i]));
  const kept = [...excluded]
    .sort(
      (a, b) =>
        order.get(a.reasonKey)! - order.get(b.reasonKey)! ||
        naturally(a.room.listing.name, b.room.listing.name) ||
        naturally(a.room.number, b.room.number),
    )
    .slice(0, MAX_EXCLUDED);

  const candidates: CandidateRow[] = [
    ...ranked.map((r) => ({
      room_id: r.room.id,
      bed_id: r.bed.id,
      excluded: false,
      exclusion_reason: null,
      rank: r.rank,
      score_total: r.scores.total,
      score_room_type: r.scores.roomType,
      score_budget: r.scores.budget,
      score_distance: r.scores.distance,
      score_facilities: r.scores.facilities,
      score_availability: r.scores.availability,
      explanation: r.explanation,
    })),
    ...kept.map((e) => ({
      room_id: e.room.id,
      bed_id: null,
      excluded: true,
      exclusion_reason: e.reason,
      rank: null,
      score_total: null,
      score_room_type: null,
      score_budget: null,
      score_distance: null,
      score_facilities: null,
      score_availability: null,
      explanation: null,
    })),
  ];

  return {
    ranked,
    excluded: kept,
    failCounts,
    considered: input.rooms.length,
    explanation: runExplanation(input, on, { eligible: eligible.length, ranked: ranked.length, excluded: excluded.length }, failCounts),
    candidates,
  };
}

/** Facility labels for the screens, in the usual order. */
export function facilityLabels(keys: readonly string[]): string[] {
  return FACILITIES.filter((f) => keys.includes(f.key)).map((f) => f.label);
}
