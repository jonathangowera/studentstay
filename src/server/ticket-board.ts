import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { BoardRow } from "@/components/tickets/TicketBoard";
import { formatDateTimeCAT } from "@/lib/format";
import { dueState, isOpenTicket, sortQueue } from "@/lib/tickets/labels";
import { managerMoves } from "@/lib/transitions";
import { managedListings, technicians, ticketsForListings, transitionsFor, type Manager } from "./tickets";

type Client = SupabaseClient<Database>;

/** Everything the owner or administrator repairs page needs, read with their own session. Open tickets first. */
export async function loadBoard(supabase: Client, m: Manager): Promise<{ rows: BoardRow[]; technicians: { id: string; full_name: string }[]; properties: number }> {
  const listings = await managedListings(supabase, m);
  const [tickets, rows, techs] = await Promise.all([
    ticketsForListings(
      supabase,
      listings.map((l) => l.id),
    ),
    transitionsFor(supabase, "ticket"),
    technicians(supabase),
  ]);
  const names = new Map(listings.map((l) => [l.id, l.name]));
  const techNames = new Map(techs.map((t) => [t.id, t.full_name]));
  const now = new Date();
  const ordered = [...sortQueue(tickets.filter((t) => isOpenTicket(t.status))), ...tickets.filter((t) => !isOpenTicket(t.status))];
  return {
    properties: listings.length,
    technicians: techs,
    rows: ordered.map((t) => {
      const moves = managerMoves(rows, t.status);
      return {
        id: t.id,
        reference: t.reference,
        title: t.title,
        category: t.category,
        property: names.get(t.listing_id) ?? "Property",
        location: t.location_text,
        priority: t.priority,
        status: t.status,
        statusNote: t.status_note,
        assignedName: t.assigned_to ? (techNames.get(t.assigned_to) ?? "A technician") : null,
        due: dueState(t.due_at, t.status, now),
        dueText: t.due_at ? formatDateTimeCAT(t.due_at) : null,
        createdText: `Reported ${formatDateTimeCAT(t.created_at)}`,
        assign: moves.assign,
        escalate: moves.escalate,
      };
    }),
  };
}
