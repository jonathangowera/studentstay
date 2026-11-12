"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { TICKET_MOVE, isTicketReference, managerMoves, parseManagerMove, parseTicketMove, technicianMoves } from "@/lib/transitions";
import { manageMessage, ticketMessage } from "@/lib/tickets/messages";
import { managedListings, technicians, ticketByReference, transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export type TicketState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  errorRef?: string;
  fieldErrors?: FieldErrors;
};

/**
 * A technician moves their own ticket: Start work, Mark completed or Escalate. Only the moves state_transitions
 * allows from the current status are accepted, and set_ticket_status checks the assignment again.
 */
export async function setTicketStatusAction(_prev: TicketState, form: FormData): Promise<TicketState> {
  const ref = form.get("reference");
  const reference = typeof ref === "string" && isTicketReference(ref.trim()) ? ref.trim() : null;
  const session = await requireRole("technician", reference ? `/technician/tickets/${reference}` : "/technician");

  const parsed = parseTicketMove(form);
  if (!parsed.ok) return { status: "error", message: parsed.errors.form ?? "Check the highlighted field.", fieldErrors: parsed.errors };
  const input = parsed.data;

  try {
    const supabase = await createClient();
    const ticket = await ticketByReference(supabase, input.reference);
    if (!ticket || ticket.id !== input.ticketId) return { status: "error", code: "TICKET_NOT_FOUND", message: ticketMessage("TICKET_NOT_FOUND") };
    if (ticket.assigned_to !== session.userId) return { status: "error", code: "NOT_ALLOWED", message: ticketMessage("NOT_ALLOWED") };
    const moves = technicianMoves(await transitionsFor(supabase, "ticket"), ticket.status, true);
    if (!moves.includes(input.to)) return { status: "error", code: "INVALID_TRANSITION", message: ticketMessage("INVALID_TRANSITION") };

    const { error } = await supabase.rpc("set_ticket_status", {
      p_ticket: input.ticketId,
      p_new: input.to,
      ...(input.note ? { p_note: input.note } : {}),
    });
    if (error) {
      const f = reportError("set ticket status", error);
      return { status: "error", code: f.code, message: ticketMessage(f.code), errorRef: f.reference };
    }
    revalidatePath("/technician", "layout");
    return { status: "success", message: TICKET_MOVE[input.to].done };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("set ticket status", err);
    return { status: "error", code: f.code, message: ticketMessage(f.code), errorRef: f.reference };
  }
}

const MANAGER_HOME = { owner: "/owner/tickets", university_admin: "/admin/tickets" } as const;

/**
 * An owner or university administrator assigns a ticket of their property to a technician (assign_ticket), or
 * escalates it (set_ticket_status). The ticket must be in their scope and the move allowed from its status.
 */
export async function manageTicketAction(_prev: TicketState, form: FormData): Promise<TicketState> {
  const from = form.get("from") === "/admin/tickets" ? "/admin/tickets" : "/owner/tickets";
  const session = await requireRole(["owner", "university_admin"], from);
  const role = session.role as "owner" | "university_admin";

  const parsed = parseManagerMove(form);
  if (!parsed.ok) return { status: "error", message: parsed.errors.form ?? "Check the highlighted field.", fieldErrors: parsed.errors };
  const input = parsed.data;

  try {
    const supabase = await createClient();
    const ticket = await ticketByReference(supabase, input.reference);
    if (!ticket || ticket.id !== input.ticketId) return { status: "error", code: "TICKET_NOT_FOUND", message: ticketMessage("TICKET_NOT_FOUND") };
    const scope = await managedListings(supabase, { role, userId: session.userId, institutionId: session.profile.institution_id });
    if (!scope.some((l) => l.id === ticket.listing_id)) return { status: "error", code: "NOT_ALLOWED", message: manageMessage("NOT_ALLOWED") };
    const moves = managerMoves(await transitionsFor(supabase, "ticket"), ticket.status);

    if (input.kind === "assign") {
      if (!moves.assign) return { status: "error", code: "INVALID_TRANSITION", message: ticketMessage("INVALID_TRANSITION") };
      const techs = await technicians(supabase);
      const tech = techs.find((t) => t.id === input.technicianId);
      if (!tech) return { status: "error", code: "NOT_A_TECHNICIAN", message: manageMessage("NOT_A_TECHNICIAN"), fieldErrors: { technician_id: "Choose a technician." } };
      const { error } = await supabase.rpc("assign_ticket", {
        p_ticket: ticket.id,
        p_technician: tech.id,
        ...(input.note ? { p_note: input.note } : {}),
      });
      if (error) {
        const f = reportError("assign ticket", error);
        return { status: "error", code: f.code, message: manageMessage(f.code), errorRef: f.reference };
      }
      revalidatePath(MANAGER_HOME[role]);
      return { status: "success", message: `${ticket.reference} is assigned to ${tech.full_name}. They were told.` };
    }

    if (!moves.escalate) return { status: "error", code: "INVALID_TRANSITION", message: ticketMessage("INVALID_TRANSITION") };
    const { error } = await supabase.rpc("set_ticket_status", { p_ticket: ticket.id, p_new: "escalated", p_note: input.note });
    if (error) {
      const f = reportError("escalate ticket", error);
      return { status: "error", code: f.code, message: manageMessage(f.code), errorRef: f.reference };
    }
    revalidatePath(MANAGER_HOME[role]);
    return { status: "success", message: `${ticket.reference} is escalated. The tenant was told.` };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("manage ticket", err);
    return { status: "error", code: f.code, message: manageMessage(f.code), errorRef: f.reference };
  }
}
