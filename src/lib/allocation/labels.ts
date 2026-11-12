/**
 * Labels and grouping for the administrator's allocation screens. Pure and unit tested.
 * Wording rule: a recommendation is never called approved or allocated until an administrator decides.
 */
import type { IconName } from "@/components/ui/Icon";
import type { Tone } from "@/components/ui/StatusPill";
import { CONSTRAINT_ORDER, type HardConstraintKey } from "./types";
import { activeConstraints } from "./engine";

export type DecisionValue = "pending" | "approved" | "modified" | "rejected" | "rerun";

export const DECISION_PILL: Record<DecisionValue, { label: string; tone: Tone; icon: IconName }> = {
  pending: { label: "Waiting for your decision", tone: "info", icon: "clock" },
  approved: { label: "Approved", tone: "ok", icon: "check-c" },
  modified: { label: "Approved with a change", tone: "ok", icon: "check-c" },
  rejected: { label: "Rejected", tone: "bad", icon: "x-c" },
  rerun: { label: "Sent back to match again", tone: "mute", icon: "clock" },
};

export const CONSTRAINT_TEXT: Record<HardConstraintKey, { title: string; text: string }> = {
  institution_eligible: { title: "Institution recognition", text: "The property must be recognised by the student's institution." },
  bed_free: { title: "Free bed", text: "The room must have a bed that is free now." },
  gender_policy: { title: "Gender policy", text: "The room's policy (or the property's, if the room has none) must match who can stay." },
  room_type: { title: "Room type", text: "The room type must be the one the student asked for." },
  budget_ceiling: { title: "Budget ceiling", text: "The monthly price must not be above the student's budget." },
};

/** The rule's switches in the engine's order, for the rules page. A missing switch counts as on. */
export function constraintSwitches(hard: unknown): { key: HardConstraintKey; on: boolean; title: string; text: string }[] {
  const on = activeConstraints(hard);
  return CONSTRAINT_ORDER.map((key) => ({ key, on: on[key], ...CONSTRAINT_TEXT[key] }));
}

export type ExcludedLike = { exclusionReason: string | null; listingName: string; roomNumber: string; wing: string | null };

/**
 * Excluded rooms grouped by their reason, biggest group first. Reasons that carry a detail (a price or a policy)
 * are grouped by the part before the bracket or colon, so "Above your budget (K900 a month)" and
 * "Above your budget (K950 a month)" land together.
 */
export function groupExcluded<T extends ExcludedLike>(rows: readonly T[]): { reason: string; rooms: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const reason = (r.exclusionReason ?? "Other").replace(/\s*\(.*\)$/, "").replace(/:.*$/, "").trim() || "Other";
    groups.set(reason, [...(groups.get(reason) ?? []), r]);
  }
  return [...groups.entries()].map(([reason, rooms]) => ({ reason, rooms })).sort((a, b) => b.rooms.length - a.rooms.length || a.reason.localeCompare(b.reason));
}

/** "Riverside Hall · Block 3 · Room 309 · Bed A". */
export function placeLine(p: { listingName: string; wing: string | null; roomNumber: string; bedLabel?: string | null }): string {
  return [p.listingName, p.wing, `Room ${p.roomNumber}`, p.bedLabel ? `Bed ${p.bedLabel}` : null].filter(Boolean).join(" · ");
}
