/**
 * Allowed state changes come from the state_transitions table, never from hard-coded lists.
 * These helpers narrow those rows to what one role may do from one state. Pure and unit tested.
 */
import type { Parsed } from "@/lib/validation";
import type { TicketStatus } from "@/lib/tickets/labels";

export type TransitionRow = { machine: string; from_state: string; to_state: string };

/** Every state the database allows from `from` for this machine, in table order without duplicates. */
export function allowedMoves(rows: readonly TransitionRow[], machine: string, from: string): string[] {
  const out: string[] = [];
  for (const r of rows) if (r.machine === machine && r.from_state === from && !out.includes(r.to_state)) out.push(r.to_state);
  return out;
}

/** What set_ticket_status lets a technician do on a ticket assigned to them. */
export const TECHNICIAN_MOVES = ["in_progress", "completed", "escalated"] as const;
export type TechnicianMove = (typeof TECHNICIAN_MOVES)[number];

export const TICKET_MOVE: Record<TechnicianMove, { label: string; title: string; note: "optional" | "required"; noteLabel: string; done: string }> = {
  in_progress: {
    label: "Start work",
    title: "Start work on this request?",
    note: "optional",
    noteLabel: "Note (optional)",
    done: "Marked as in progress. The tenant was told.",
  },
  completed: {
    label: "Mark completed",
    title: "Mark this request completed?",
    note: "required",
    noteLabel: "What was done",
    done: "Marked as completed. The tenant was told and can reopen it within 7 days.",
  },
  escalated: {
    label: "Escalate",
    title: "Escalate this request?",
    note: "required",
    noteLabel: "Reason for escalating",
    done: "Escalated. The owner or administrator will follow up.",
  },
};

/**
 * The moves a technician is offered: the database's allowed moves from the current status, narrowed to the
 * technician's own moves, and nothing at all when the ticket is not assigned to them.
 */
export function technicianMoves(rows: readonly TransitionRow[], status: TicketStatus, assignedToMe: boolean): TechnicianMove[] {
  if (!assignedToMe) return [];
  const allowed = allowedMoves(rows, "ticket", status);
  return TECHNICIAN_MOVES.filter((m) => allowed.includes(m));
}

/**
 * What an owner or university administrator is offered on a ticket of their property: Assign (assign_ticket moves it
 * to assigned) and Escalate (set_ticket_status). Each only when state_transitions allows it from the current status.
 */
export function managerMoves(rows: readonly TransitionRow[], status: TicketStatus): { assign: boolean; escalate: boolean } {
  const allowed = allowedMoves(rows, "ticket", status);
  return { assign: allowed.includes("assigned"), escalate: allowed.includes("escalated") };
}

export type ManagerInput =
  | { kind: "assign"; ticketId: string; reference: string; technicianId: string; note: string | null }
  | { kind: "escalate"; ticketId: string; reference: string; note: string };

/** The owner or administrator form: Assign needs a technician, Escalate needs a reason. */
export function parseManagerMove(form: FormLike): Parsed<ManagerInput> {
  const ticketId = text(form, "ticket_id");
  const reference = text(form, "reference");
  const kind = text(form, "kind");
  const technicianId = text(form, "technician_id");
  const note = text(form, "note");
  if (!UUID.test(ticketId) || !isTicketReference(reference) || (kind !== "assign" && kind !== "escalate")) {
    return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  }
  if (note.length > NOTE_MAX) return { ok: false, errors: { note: `Use ${NOTE_MAX} characters or fewer.` } };
  if (kind === "assign") {
    if (!UUID.test(technicianId)) return { ok: false, errors: { technician_id: "Choose a technician." } };
    return { ok: true, data: { kind, ticketId, reference, technicianId, note: note || null } };
  }
  if (!note) return { ok: false, errors: { note: "Give a reason for escalating." } };
  return { ok: true, data: { kind, ticketId, reference, note } };
}

export function isTechnicianMove(value: string): value is TechnicianMove {
  return (TECHNICIAN_MOVES as readonly string[]).includes(value);
}

type FormLike = { get(name: string): unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET_REF = /^TKT-\d{1,9}$/;
export const NOTE_MAX = 500;

export function isTicketReference(value: string): boolean {
  return TICKET_REF.test(value);
}

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export type TicketMoveInput = { ticketId: string; reference: string; to: TechnicianMove; note: string | null };

/** The technician's status form. A note is required to complete or escalate. */
export function parseTicketMove(form: FormLike): Parsed<TicketMoveInput> {
  const ticketId = text(form, "ticket_id");
  const reference = text(form, "reference");
  const to = text(form, "to");
  const note = text(form, "note");
  if (!UUID.test(ticketId) || !isTicketReference(reference) || !isTechnicianMove(to)) {
    return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  }
  if (TICKET_MOVE[to].note === "required" && !note) {
    return { ok: false, errors: { note: to === "completed" ? "Say briefly what was done." : "Give a reason for escalating." } };
  }
  if (note.length > NOTE_MAX) return { ok: false, errors: { note: `Use ${NOTE_MAX} characters or fewer.` } };
  return { ok: true, data: { ticketId, reference, to, note: note || null } };
}
