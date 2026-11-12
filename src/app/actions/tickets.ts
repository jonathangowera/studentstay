"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { TICKET_MOVE, isTicketReference, parseTicketMove, technicianMoves } from "@/lib/transitions";
import { ticketMessage } from "@/lib/tickets/messages";
import { ticketByReference, transitionsFor } from "@/server/tickets";
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
