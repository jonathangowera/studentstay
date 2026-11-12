import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ApplicationStatus } from "@/lib/applications/status";
import { countBeds, type BedCounts } from "@/lib/listings/beds";
import type { BedState, ListingType, ModerationState, ReviewDecision, RoomType } from "@/lib/listings/labels";
import type { FreeBed } from "@/lib/owner/decision";
import { OPEN_TICKET_STATUSES, type TicketPriority, type TicketStatus } from "@/lib/tickets/labels";

/**
 * Owner reads. Always the owner's own session: row-level security decides the rows.
 * Listings are also filtered to the owner's own businesses, because published listings of other owners are
 * readable too. Columns on listings, rooms and beds are always named.
 */
type Client = SupabaseClient<Database>;

export type Business = { id: string; business_name: string };

/** The owner's businesses (partners), oldest first. Empty means the owner still has to set one up. */
export async function ownerBusinesses(supabase: Client, userId: string): Promise<Business[]> {
  const { data, error } = await supabase.from("partners").select("id, business_name").eq("owner_id", userId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export type OwnerListing = {
  id: string;
  name: string;
  type: ListingType;
  area: string;
  rent_unit: string;
  moderation: ModerationState;
  verification: ReviewDecision;
  last_updated_at: string;
  beds: BedCounts;
};

export async function ownerListings(supabase: Client, partnerIds: readonly string[]): Promise<OwnerListing[]> {
  if (!partnerIds.length) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("id, name, type, area, rent_unit, moderation, verification, last_updated_at, rooms(id, beds(id, state))")
    .in("partner_id", [...partnerIds])
    .order("name");
  if (error) throw error;
  return (data ?? []).map(({ rooms, ...l }) => ({
    ...l,
    beds: countBeds((rooms ?? []).flatMap((r) => (r.beds ?? []).map((b) => b.state as BedState))),
  }));
}

export type InboxRow = {
  id: string;
  reference: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  listing_id: string;
  requested_room_type: RoomType | null;
  budget_zmw: number | null;
  intake: string | null;
  /** The view already says "Applicant" when the student turned off owner visibility. */
  applicant_name: string;
  applicant_institution: string | null;
  document_count: number;
};

const INBOX_COLUMNS =
  "id, reference, status, submitted_at, listing_id, requested_room_type, budget_zmw, intake, applicant_name, applicant_institution, document_count";

type InboxDbRow = Database["public"]["Views"]["private_application_inbox"]["Row"];

function toInbox(r: InboxDbRow): InboxRow | null {
  if (!r.id || !r.reference || !r.status || !r.listing_id) return null;
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    submitted_at: r.submitted_at,
    listing_id: r.listing_id,
    requested_room_type: r.requested_room_type,
    budget_zmw: r.budget_zmw,
    intake: r.intake,
    applicant_name: r.applicant_name || "Applicant",
    applicant_institution: r.applicant_institution,
    document_count: Number(r.document_count ?? 0),
  };
}

/** The private application inbox. The view shows only applications to the owner's own listings. Drafts are left out. */
export async function inbox(supabase: Client): Promise<InboxRow[]> {
  const { data, error } = await supabase
    .from("private_application_inbox")
    .select(INBOX_COLUMNS)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(toInbox).filter((r): r is InboxRow => r !== null);
}

export async function inboxRow(supabase: Client, reference: string): Promise<InboxRow | null> {
  const { data, error } = await supabase.from("private_application_inbox").select(INBOX_COLUMNS).eq("reference", reference).maybeSingle();
  if (error) throw error;
  return data ? toInbox(data) : null;
}

/** Free (available) beds of one listing, with their room. */
export async function freeBeds(supabase: Client, listingId: string): Promise<FreeBed[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, room_number, room_type, price_zmw, beds(id, label, state)")
    .eq("listing_id", listingId);
  if (error) throw error;
  return (data ?? []).flatMap((r) =>
    (r.beds ?? [])
      .filter((b) => b.state === "available")
      .map((b) => ({ id: b.id, label: b.label, roomNumber: r.room_number, roomType: r.room_type, price: Number(r.price_zmw) })),
  );
}

export type OwnerTicket = {
  id: string;
  reference: string;
  title: string;
  location_text: string;
  priority: TicketPriority;
  status: TicketStatus;
  due_at: string | null;
  created_at: string;
  listing_id: string;
};

/** Open repair requests on the owner's listings. */
export async function openTicketsFor(supabase: Client, listingIds: readonly string[]): Promise<OwnerTicket[]> {
  if (!listingIds.length) return [];
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, reference, title, location_text, priority, status, due_at, created_at, listing_id")
    .in("listing_id", [...listingIds])
    .in("status", [...OPEN_TICKET_STATUSES])
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
