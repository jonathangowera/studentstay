/**
 * Application rules checked in the app. Pure and unit tested.
 * TODO: a database rule for "one open university allocation application" can come later (see Known gaps).
 */
import { isEditable, isOpen, type ApplicationRoute, type ApplicationStatus } from "./status";

export type AppSummary = { reference: string; route: ApplicationRoute; status: ApplicationStatus; created_at: string };

/** The student's open university allocation application, newest first, or null. */
export function openUniversityApplication<T extends AppSummary>(apps: readonly T[]): T | null {
  const open = apps
    .filter((a) => a.route === "university_allocation" && isOpen(a.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return open[0] ?? null;
}

/**
 * What to do when the student starts a new university allocation application.
 * - none open: go ahead
 * - a draft or profile incomplete one: continue that one instead (edit link)
 * - any other open one: blocked, with a link to it
 */
export function universityStartDecision<T extends AppSummary>(
  apps: readonly T[],
): { kind: "new" } | { kind: "continue"; app: T } | { kind: "blocked"; app: T } {
  const open = openUniversityApplication(apps);
  if (!open) return { kind: "new" };
  return isEditable(open.status) ? { kind: "continue", app: open } : { kind: "blocked", app: open };
}

/** The open application to one place, if any (the database also refuses a second one). */
export function openApplicationTo<T extends AppSummary & { listing_id: string | null }>(apps: readonly T[], listingId: string): T | null {
  return apps.find((a) => a.listing_id === listingId && isOpen(a.status)) ?? null;
}

export type Transition = { machine: string; from_state: string; to_state: string };

/** Withdraw is offered only when the state_transitions table allows status -> withdrawn. */
export function canWithdraw(status: ApplicationStatus, transitions: readonly Transition[]): boolean {
  return transitions.some((t) => t.machine === "application" && t.from_state === status && t.to_state === "withdrawn");
}

/** APP-2026-0412. Used by the redirect for notification links. */
export const REFERENCE_PATTERN = /^APP-\d{4}-\d{4,}$/;

export function isApplicationReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}
