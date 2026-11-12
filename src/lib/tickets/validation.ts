/**
 * The student's repair form and the reopen rule. Pure and unit tested.
 * The database checks again: tkt_insert needs a live booking at that listing, set_ticket_status checks the 7 days.
 */
import type { Parsed } from "@/lib/validation";
import { allowedMoves, type TransitionRow } from "@/lib/transitions";
import { TICKET_CATEGORIES, type TicketPriority, type TicketStatus } from "./labels";

type FormLike = { get(name: string): unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITIES: readonly TicketPriority[] = ["low", "medium", "high"];

export const LIMITS = { title: 120, description: 1000, location: 200, note: 500 } as const;

export type RepairInput = {
  bookingId: string;
  category: (typeof TICKET_CATEGORIES)[number];
  title: string;
  description: string | null;
  priority: TicketPriority;
  location: string;
};

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function parseRepair(form: FormLike): Parsed<RepairInput> {
  const bookingId = text(form, "booking_id");
  const category = text(form, "category");
  const title = text(form, "title");
  const description = text(form, "description");
  const priority = text(form, "priority");
  const location = text(form, "location");
  const errors: Record<string, string> = {};
  if (!UUID.test(bookingId)) errors.booking_id = "Choose the place the repair is for.";
  if (!(TICKET_CATEGORIES as readonly string[]).includes(category)) errors.category = "Choose a category.";
  if (title.length < 3) errors.title = "Give a short title, at least 3 characters.";
  else if (title.length > LIMITS.title) errors.title = `Use ${LIMITS.title} characters or fewer.`;
  if (description.length > LIMITS.description) errors.description = `Use ${LIMITS.description} characters or fewer.`;
  if (!(PRIORITIES as readonly string[]).includes(priority)) errors.priority = "Choose how urgent it is.";
  if (location.length < 3) errors.location = "Say where the problem is, for example the room and bathroom.";
  else if (location.length > LIMITS.location) errors.location = `Use ${LIMITS.location} characters or fewer.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      bookingId,
      category: category as RepairInput["category"],
      title,
      description: description || null,
      priority: priority as TicketPriority,
      location,
    },
  };
}

/** The default location text: "Listing, Room 12, bed A". The student can change it. */
export function defaultLocation(listingName: string, roomNumber: string, bedLabel: string): string {
  return `${listingName}, Room ${roomNumber}, bed ${bedLabel}`;
}

export const REOPEN_DAYS = 7;

/** A completed request can be reopened for 7 days, when state_transitions allows completed to reopened. */
export function canReopen(
  t: { status: TicketStatus; completed_at: string | null },
  rows: readonly TransitionRow[],
  now: Date = new Date(),
): boolean {
  if (t.status !== "completed" || !t.completed_at) return false;
  if (!allowedMoves(rows, "ticket", "completed").includes("reopened")) return false;
  const done = Date.parse(t.completed_at);
  return !Number.isNaN(done) && now.getTime() - done <= REOPEN_DAYS * 24 * 60 * 60 * 1000;
}

/** The last day to reopen, for the hint under the button. */
export function reopenUntil(completedAt: string): string {
  return new Date(Date.parse(completedAt) + REOPEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
