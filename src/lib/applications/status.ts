/**
 * Application statuses: labels, pills, plain "what happens next" text, the dashboard progress steps and the
 * timeline. Pure and unit tested. The allowed changes live in the state_transitions table, not here.
 *
 * Wording rule: a recommendation is never called an approval or an allocation.
 */
import type { Database } from "@/lib/database.types";
import type { IconName } from "@/components/ui/Icon";
import type { Tone } from "@/components/ui/StatusPill";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type ApplicationRoute = Database["public"]["Enums"]["application_route"];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  profile_incomplete: "Profile incomplete",
  under_review: "Under review",
  recommended: "Recommended",
  pending_approval: "Waiting for administrator approval",
  approved: "Approved",
  accepted: "Accepted",
  declined: "Declined",
  no_eligible_room: "No eligible room",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

const PILL: Record<ApplicationStatus, { tone: Tone; icon: IconName }> = {
  draft: { tone: "mute", icon: "file" },
  submitted: { tone: "info", icon: "check" },
  profile_incomplete: { tone: "warn", icon: "alert" },
  under_review: { tone: "info", icon: "clock" },
  recommended: { tone: "info", icon: "sparkle" },
  pending_approval: { tone: "info", icon: "clock" },
  approved: { tone: "ok", icon: "check-c" },
  accepted: { tone: "ok", icon: "check-c" },
  declined: { tone: "bad", icon: "x-c" },
  no_eligible_room: { tone: "bad", icon: "ban" },
  withdrawn: { tone: "mute", icon: "x" },
  expired: { tone: "mute", icon: "clock" },
};

export function statusPill(status: ApplicationStatus): { tone: Tone; icon: IconName; label: string } {
  return { ...PILL[status], label: STATUS_LABEL[status] };
}

export const ROUTE_LABEL: Record<ApplicationRoute, string> = {
  university_allocation: "University allocation",
  private: "Private application",
};

/**
 * Statuses that end an application. Everything else is "open".
 * Matches the database index applications_one_open_per_listing (supabase/migrations/20261111000000_initial_schema.sql).
 */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = ["declined", "withdrawn", "expired", "no_eligible_room"];

export function isOpen(status: ApplicationStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

/** Draft and profile incomplete can still be edited by the student (policy app_update). */
export const EDITABLE_STATUSES: readonly ApplicationStatus[] = ["draft", "profile_incomplete"];

export function isEditable(status: ApplicationStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Plain explanation of what the status means and what happens next. */
export function statusExplanation(status: ApplicationStatus, route: ApplicationRoute): string {
  const uni = route === "university_allocation";
  switch (status) {
    case "draft":
      return "Your application is saved but not sent yet. Check your details and submit it.";
    case "submitted":
      return uni
        ? "Your university has your application. The system will look for rooms that fit your preferences, and an administrator will review the result."
        : "The owner has your application and will review it. You will get an update here.";
    case "profile_incomplete":
      return "Some details are missing, so your application cannot go further yet. Add them, then submit again.";
    case "under_review":
      return "The owner is reviewing your application. They will accept or decline it.";
    case "recommended":
      return "The system found a room that fits your preferences. This is a recommendation only. An administrator reviews it next.";
    case "pending_approval":
      return "An administrator is reviewing the recommended room. It becomes your allocation only after they approve it.";
    case "approved":
      return "An administrator approved a bed for you. Your booking details are below.";
    case "accepted":
      return "The owner accepted your application and a bed is held for you. Deposit payment opens in a later release.";
    case "declined":
      return uni
        ? "Your application was not approved. The reason is below. You can apply again with different preferences."
        : "The owner declined your application. The reason is below. You can apply to another place.";
    case "no_eligible_room":
      return "No room met your preferences and the university rules at this time. You can change your preferences or look at private rentals.";
    case "withdrawn":
      return "You withdrew this application. Any bed set aside for it has been released.";
    case "expired":
      return "This application expired because it was not completed in time. You can start a new one.";
  }
}

// ---------------------------------------------------------------- dashboard progress

export type StepState = "done" | "now" | "todo";
export type Progress = { steps: { label: string; state: StepState }[]; percent: number };

const UNI_STEPS = ["Submitted", "Recommended", "Administrator review", "Approved"];
const PRIVATE_STEPS = ["Submitted", "Owner review", "Accepted", "Deposit"];

/** How many steps are complete for each open status. */
const DONE: Record<ApplicationRoute, Partial<Record<ApplicationStatus, number>>> = {
  university_allocation: { draft: 0, profile_incomplete: 0, submitted: 1, recommended: 2, pending_approval: 2, approved: 4 },
  private: { draft: 0, profile_incomplete: 0, submitted: 1, under_review: 1, accepted: 3 },
};

/** The progress bar and stepper on the dashboard. Null for closed applications, which have no next step. */
export function progressFor(status: ApplicationStatus, route: ApplicationRoute): Progress | null {
  const done = DONE[route][status];
  if (done === undefined) return null;
  const labels = route === "university_allocation" ? UNI_STEPS : PRIVATE_STEPS;
  const steps = labels.map((label, i) => ({
    label,
    state: (i < done ? "done" : i === done ? "now" : "todo") as StepState,
  }));
  return { steps, percent: Math.round((done / labels.length) * 100) };
}

// ---------------------------------------------------------------- timeline

export type EventRow = { from_status: ApplicationStatus | null; to_status: ApplicationStatus; note: string | null; created_at: string };
export type TimelineItem = { key: string; status: ApplicationStatus; label: string; note: string | null; at: string; current: boolean };

/** application_events, oldest first, as timeline items. The last item is the current status. */
export function timelineFrom(events: readonly EventRow[]): TimelineItem[] {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return sorted.map((e, i) => ({
    key: `${i}-${e.to_status}`,
    status: e.to_status,
    label: STATUS_LABEL[e.to_status],
    note: e.note && e.note.trim() ? e.note.trim() : null,
    at: e.created_at,
    current: i === sorted.length - 1,
  }));
}

// ---------------------------------------------------------------- profile incomplete

export type MissingItem = { label: string; fixIn: "profile" | "application" };

/**
 * submit_application sets status_reason to "Missing: institution, student number, room type, budget".
 * Institution and student number come from the profile. Room type and budget come from the application.
 */
export function missingFromReason(reason: string | null): MissingItem[] {
  const m = /^Missing:\s*(.+)$/i.exec(reason?.trim() ?? "");
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((label) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      fixIn: label === "institution" || label === "student number" ? "profile" : "application",
    }));
}
