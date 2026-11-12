import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { TicketEventRow, TicketPriority, TicketStatus } from "@/lib/tickets/labels";
import type { TransitionRow } from "@/lib/transitions";

/** Repair request reads. Always the signed-in person's own session; row-level security decides the rows. */
type Client = SupabaseClient<Database>;

export type QueueTicket = {
  id: string;
  reference: string;
  location_text: string;
  category: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  due_at: string | null;
  created_at: string;
};

/** Every ticket assigned to this technician. */
export async function technicianTickets(supabase: Client, userId: string): Promise<QueueTicket[]> {
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, reference, location_text, category, title, priority, status, due_at, created_at")
    .eq("assigned_to", userId);
  if (error) throw error;
  return data ?? [];
}

export type TicketDetail = QueueTicket & {
  description: string | null;
  access_notes: string | null;
  status_note: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  updated_at: string;
};

export async function ticketByReference(supabase: Client, reference: string): Promise<TicketDetail | null> {
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select(
      "id, reference, location_text, category, title, priority, status, due_at, created_at, description, access_notes, status_note, assigned_to, completed_at, updated_at",
    )
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The ticket timeline: status, note and time. The actor is not read (other people's profiles are hidden). */
export async function ticketEvents(supabase: Client, ticketId: string): Promise<TicketEventRow[]> {
  const { data, error } = await supabase
    .from("ticket_events")
    .select("id, from_status, to_status, note, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data ?? [];
}

/** Allowed state changes for one machine, from the state_transitions table. */
export async function transitionsFor(supabase: Client, machine: string): Promise<TransitionRow[]> {
  const { data, error } = await supabase.from("state_transitions").select("machine, from_state, to_state").eq("machine", machine);
  if (error) throw error;
  return data ?? [];
}
