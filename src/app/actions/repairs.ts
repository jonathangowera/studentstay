"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { isTicketReference } from "@/lib/transitions";
import { ticketMessage } from "@/lib/tickets/messages";
import { LIMITS, canReopen, parseRepair } from "@/lib/tickets/validation";
import { liveBookings } from "@/server/repairs";
import { ticketByReference, transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export type RepairState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  errorRef?: string;
  fieldErrors?: FieldErrors;
  reference?: string;
};

/**
 * A student with a live booking reports a repair for that place. The listing and bed come from the student's own
 * booking on the server, never from the form. Only the columns the browser may write are sent.
 */
export async function reportRepairAction(_prev: RepairState, form: FormData): Promise<RepairState> {
  const session = await requireRole("student", "/student/repairs");
  const parsed = parseRepair(form);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", fieldErrors: parsed.errors };
  const input = parsed.data;

  try {
    const supabase = await createClient();
    const booking = (await liveBookings(supabase, session.userId)).find((b) => b.bookingId === input.bookingId);
    if (!booking) {
      return { status: "error", code: "NO_LIVE_BOOKING", message: "You can report a repair only for a place you have a reserved or occupied booking for." };
    }
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .insert({
        listing_id: booking.listingId,
        bed_id: booking.bedId,
        booking_id: booking.bookingId,
        reporter_id: session.userId,
        location_text: input.location,
        category: input.category,
        title: input.title,
        description: input.description,
        priority: input.priority,
      })
      .select("reference")
      .single();
    if (error) {
      const f = reportError("report repair", error);
      return { status: "error", code: f.code, message: f.code === "42501" ? "You can report a repair only for a place you have a live booking for." : f.message, errorRef: f.reference };
    }
    revalidatePath("/student", "layout");
    return { status: "success", reference: data.reference, message: `Repair request ${data.reference} was sent. The owner can now assign a technician.` };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("report repair", err);
    return { status: "error", code: f.code, message: f.message, errorRef: f.reference };
  }
}

/** Reopen a completed request within 7 days. The note is optional. set_ticket_status checks the window again. */
export async function reopenRepairAction(_prev: RepairState, form: FormData): Promise<RepairState> {
  const session = await requireRole("student", "/student/repairs");
  const raw = form.get("reference");
  const reference = typeof raw === "string" ? raw.trim() : "";
  const noteRaw = form.get("note");
  const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
  if (!isTicketReference(reference)) return { status: "error", code: "TICKET_NOT_FOUND", message: ticketMessage("TICKET_NOT_FOUND") };
  if (note.length > LIMITS.note) return { status: "error", message: `Use ${LIMITS.note} characters or fewer.`, fieldErrors: { note: `Use ${LIMITS.note} characters or fewer.` } };

  try {
    const supabase = await createClient();
    const ticket = await ticketByReference(supabase, reference);
    if (!ticket || ticket.reporter_id !== session.userId) return { status: "error", code: "TICKET_NOT_FOUND", message: ticketMessage("TICKET_NOT_FOUND") };
    if (!canReopen(ticket, await transitionsFor(supabase, "ticket"))) {
      return { status: "error", code: "REOPEN_WINDOW_PASSED", message: ticketMessage("REOPEN_WINDOW_PASSED") };
    }
    const { error } = await supabase.rpc("set_ticket_status", { p_ticket: ticket.id, p_new: "reopened", ...(note ? { p_note: note } : {}) });
    if (error) {
      const f = reportError("reopen repair", error);
      return { status: "error", code: f.code, message: ticketMessage(f.code), errorRef: f.reference };
    }
    revalidatePath("/student", "layout");
    return { status: "success", message: `${reference} is reopened. The owner and technician can see it again.` };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("reopen repair", err);
    return { status: "error", code: f.code, message: ticketMessage(f.code), errorRef: f.reference };
  }
}
