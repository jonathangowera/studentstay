import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { OPEN_TICKET_STATUSES, type TicketEventRow, type TicketPriority, type TicketStatus } from "@/lib/tickets/labels";

/** The student's repair reads. Always the student's own session. Columns on rooms, beds and listings are named. */
type Client = SupabaseClient<Database>;

export type LiveBooking = {
  bookingId: string;
  state: "reserved" | "occupied";
  bedId: string;
  bedLabel: string;
  roomNumber: string;
  listingId: string;
  listingName: string;
};

/**
 * The student's reserved or occupied bookings, with the place. A booking whose listing the student can no longer
 * see (not published) is left out, because the place cannot be named.
 */
export async function liveBookings(supabase: Client, userId: string): Promise<LiveBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, state, bed_id, start_date")
    .eq("student_id", userId)
    .in("state", ["reserved", "occupied"])
    .order("start_date");
  if (error) throw error;
  if (!data?.length) return [];
  const { data: beds, error: bedError } = await supabase
    .from("beds")
    .select("id, label, rooms(room_number, listing_id, listings(id, name))")
    .in(
      "id",
      data.map((b) => b.bed_id),
    );
  if (bedError) throw bedError;
  const byId = new Map((beds ?? []).map((b) => [b.id, b]));
  const out: LiveBooking[] = [];
  for (const b of data) {
    const bed = byId.get(b.bed_id);
    const room = bed?.rooms;
    const listing = room?.listings;
    if (!bed || !room || !listing) continue;
    out.push({
      bookingId: b.id,
      state: b.state as LiveBooking["state"],
      bedId: bed.id,
      bedLabel: bed.label,
      roomNumber: room.room_number,
      listingId: listing.id,
      listingName: listing.name,
    });
  }
  return out;
}

export type MyTicket = {
  id: string;
  reference: string;
  title: string;
  category: string;
  location_text: string;
  priority: TicketPriority;
  status: TicketStatus;
  status_note: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function myTickets(supabase: Client, userId: string): Promise<MyTicket[]> {
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, reference, title, category, location_text, priority, status, status_note, created_at, completed_at")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function myOpenTicketCount(supabase: Client, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("maintenance_tickets")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", userId)
    .in("status", [...OPEN_TICKET_STATUSES]);
  if (error) throw error;
  return count ?? 0;
}

/** Timeline rows for several tickets at once, grouped by ticket. */
export async function eventsFor(supabase: Client, ticketIds: readonly string[]): Promise<Map<string, TicketEventRow[]>> {
  const out = new Map<string, TicketEventRow[]>();
  if (!ticketIds.length) return out;
  const { data, error } = await supabase
    .from("ticket_events")
    .select("id, ticket_id, from_status, to_status, note, created_at")
    .in("ticket_id", [...ticketIds])
    .order("created_at")
    .order("id");
  if (error) throw error;
  for (const { ticket_id, ...e } of data ?? []) out.set(ticket_id, [...(out.get(ticket_id) ?? []), e]);
  return out;
}
