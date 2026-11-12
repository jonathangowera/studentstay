/**
 * Labels for listing data. Wording follows the design files and CLAUDE.md.
 * Verification badges never say safe, secure, legal, guaranteed or genuine.
 */
import type { Database } from "@/lib/database.types";
import type { IconName } from "@/components/ui/Icon";
import type { Tone } from "@/components/ui/StatusPill";
import { plural } from "@/lib/format";

type Enums = Database["public"]["Enums"];
export type ListingType = Enums["listing_type"];
export type GenderPolicy = Enums["gender_policy"];
export type RoomType = Enums["room_type"];
export type BedState = Enums["bed_state"];
export type ReviewDecision = Enums["review_decision"];

export const LISTING_TYPES: readonly ListingType[] = ["university_hostel", "recognised_boarding_house", "private_rental"];
export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  university_hostel: "University hostel",
  recognised_boarding_house: "Recognised boarding house",
  private_rental: "Private rental",
};

export const GENDERS: readonly GenderPolicy[] = ["female_only", "male_only", "mixed"];
export const GENDER_LABEL: Record<GenderPolicy, string> = {
  female_only: "Female only",
  male_only: "Male only",
  mixed: "Mixed",
};

export const ROOM_TYPES: readonly RoomType[] = ["single", "double", "triple", "quad"];
export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
};

/** The facility keys stored in listings.facilities, in display order. */
export const FACILITIES = [
  { key: "wifi", label: "Wi-Fi", icon: "wifi" },
  { key: "water", label: "Water tank", icon: "water" },
  { key: "power", label: "Backup power", icon: "bolt" },
  { key: "guard", label: "Security guard", icon: "shield" },
  { key: "cctv", label: "CCTV", icon: "cctv" },
  { key: "fire", label: "Fire extinguishers", icon: "flame" },
  { key: "study", label: "Study room", icon: "book" },
  { key: "laundry", label: "Laundry", icon: "laundry" },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type FacilityKey = (typeof FACILITIES)[number]["key"];
export const FACILITY_KEYS: readonly string[] = FACILITIES.map((f) => f.key);

/** Known facilities in display order, then any unknown keys with a plain label. */
export function facilityList(keys: readonly string[] | null | undefined): { key: string; label: string; icon: IconName }[] {
  const have = new Set(keys ?? []);
  const known = FACILITIES.filter((f) => have.has(f.key)).map((f) => ({ key: f.key, label: f.label, icon: f.icon as IconName }));
  const unknown = [...have]
    .filter((k) => !FACILITY_KEYS.includes(k))
    .map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), icon: "check-c" as IconName }));
  return [...known, ...unknown];
}

export type Badge = { label: string; tone: Tone; icon: IconName };

/** The three badge texts from CLAUDE.md, rule 4. */
export const VERIFIED_LABEL = "Verified listing information";
export const PENDING_LABEL = "Verification pending";
export const REVIEW_LABEL = "Requires review";

export function verificationBadge(v: ReviewDecision | string | null | undefined): Badge {
  switch (v) {
    case "verified":
      return { label: VERIFIED_LABEL, tone: "ok", icon: "shield-check" };
    case "requires_review":
    case "resubmission_required":
      return { label: REVIEW_LABEL, tone: "bad", icon: "alert" };
    default:
      return { label: PENDING_LABEL, tone: "warn", icon: "clock" };
  }
}

export type ModerationState = Enums["moderation_state"];

export const MODERATION_STATES: readonly ModerationState[] = ["draft", "awaiting_moderation", "published", "requires_review", "suspended"];

const MODERATION_BADGE: Record<ModerationState, Badge> = {
  draft: { label: "Draft", tone: "mute", icon: "file" },
  awaiting_moderation: { label: "Awaiting moderation", tone: "warn", icon: "clock" },
  published: { label: "Published", tone: "ok", icon: "check-c" },
  requires_review: { label: "Requires review", tone: "bad", icon: "alert" },
  suspended: { label: "Suspended", tone: "mute", icon: "ban" },
};

/** Moderation decides whether students can see a listing. Shown with an icon and text. */
export function moderationBadge(m: ModerationState | string | null | undefined): Badge {
  return MODERATION_BADGE[m as ModerationState] ?? { label: "Unknown", tone: "mute", icon: "circle" };
}

/** The three verification badges, in display order. Grouping by these keeps rule 4's wording. */
export const VERIFICATION_LABELS = [VERIFIED_LABEL, PENDING_LABEL, REVIEW_LABEL] as const;

/** "No beds available", "1 bed available", "9 beds available". */
export function bedsBadge(available: number | null | undefined): Badge {
  const n = Number(available ?? 0);
  if (n <= 0) return { label: "No beds available", tone: "mute", icon: "ban" };
  return { label: `${plural(n, "bed")} available`, tone: "ok", icon: "bed" };
}

/** Bed states, with the design's labels, icons and the CSS class used for the swatch. */
export const BED_STATES: readonly { state: BedState; label: string; icon: IconName; cls: string }[] = [
  { state: "available", label: "Available", icon: "check", cls: "available" },
  { state: "held", label: "Held", icon: "pause", cls: "held" },
  { state: "pending_approval", label: "Pending Approval", icon: "clock", cls: "pending" },
  { state: "reserved", label: "Reserved", icon: "bookmark", cls: "reserved" },
  { state: "occupied", label: "Occupied", icon: "user", cls: "occupied" },
  { state: "blocked_for_maintenance", label: "Blocked for Maintenance", icon: "ban", cls: "blocked" },
];

export function bedStateInfo(state: BedState) {
  return BED_STATES.find((b) => b.state === state) ?? BED_STATES[0];
}

/** Short names for institution codes, as the design writes them ("1.1 km to UNZA"). */
const INSTITUTION_SHORT: Record<string, string> = {
  UNZA: "UNZA",
  UNILUS: "UNILUS",
  ZCAS: "ZCAS",
  CAVENDISH: "Cavendish University",
  EHC: "Evelyn Hone College",
};

export function institutionShortName(code: string, fallback?: string | null): string {
  return INSTITUTION_SHORT[code] ?? fallback ?? code;
}

/** listing_cards.distances is JSON keyed by institution code. Sorted nearest first. */
export function distanceEntries(distances: unknown): { code: string; km: number }[] {
  if (!distances || typeof distances !== "object" || Array.isArray(distances)) return [];
  return Object.entries(distances as Record<string, unknown>)
    .map(([code, km]) => ({ code, km: Number(km) }))
    .filter((d) => Number.isFinite(d.km))
    .sort((a, b) => a.km - b.km || a.code.localeCompare(b.code));
}

/** Distances to show on a card: the chosen institution first, then the nearest others, at most two. */
export function cardDistances(distances: unknown, chosen: string | null, max = 2): { code: string; km: number }[] {
  const all = distanceEntries(distances);
  const first = chosen ? all.filter((d) => d.code === chosen) : [];
  const rest = all.filter((d) => d.code !== chosen);
  return [...first, ...rest].slice(0, max);
}
