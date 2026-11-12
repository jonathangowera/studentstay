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
  reporter_id: string;
  listing_id: string;
  completed_at: string | null;
  updated_at: string;
};

export async function ticketByReference(supabase: Client, reference: string): Promise<TicketDetail | null> {
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select(
      "id, reference, location_text, category, title, priority, status, due_at, created_at, description, access_notes, status_note, assigned_to, reporter_id, listing_id, completed_at, updated_at",
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

export type Manager = { role: "owner" | "university_admin"; userId: string; institutionId: string | null };
export type ScopeListing = { id: string; name: string };

/**
 * The properties whose repairs this person manages. An owner: listings of their own businesses. A university
 * administrator: listings partnered with their institution, and hostels their institution runs.
 */
export async function managedListings(supabase: Client, m: Manager): Promise<ScopeListing[]> {
  if (m.role === "owner") {
    const { data: partners, error } = await supabase.from("partners").select("id").eq("owner_id", m.userId);
    if (error) throw error;
    if (!partners?.length) return [];
    const { data, error: listError } = await supabase
      .from("listings")
      .select("id, name")
      .in(
        "partner_id",
        partners.map((p) => p.id),
      )
      .order("name");
    if (listError) throw listError;
    return data ?? [];
  }
  if (!m.institutionId) return [];
  const [partnered, hostels] = await Promise.all([
    supabase.from("listing_distances").select("listing_id, listings!inner(id, name)").eq("institution_id", m.institutionId).eq("partnered", true),
    supabase.from("listings").select("id, name").eq("institution_id", m.institutionId),
  ]);
  if (partnered.error) throw partnered.error;
  if (hostels.error) throw hostels.error;
  const out = new Map<string, string>();
  for (const d of partnered.data ?? []) if (d.listings) out.set(d.listings.id, d.listings.name);
  for (const h of hostels.data ?? []) out.set(h.id, h.name);
  return [...out].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export type ManagedTicket = QueueTicket & { listing_id: string; assigned_to: string | null; status_note: string | null };

/** Every ticket on these listings, newest first. */
export async function ticketsForListings(supabase: Client, listingIds: readonly string[]): Promise<ManagedTicket[]> {
  if (!listingIds.length) return [];
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, reference, location_text, category, title, priority, status, due_at, created_at, listing_id, assigned_to, status_note")
    .in("listing_id", [...listingIds])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Technicians to assign to, through list_technicians() (owners cannot read other profiles). */
export async function technicians(supabase: Client): Promise<{ id: string; full_name: string }[]> {
  const { data, error } = await supabase.rpc("list_technicians");
  if (error) throw error;
  return data ?? [];
}
