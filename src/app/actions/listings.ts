"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { ownerBedMoves, parseBedChange, parsePrice } from "@/lib/listings/beds";
import { listingMessage } from "@/lib/listings/messages";
import { bedForChange, ownerListingIds, roomListing } from "@/server/owner";
import { transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export type ListingState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  errorRef?: string;
  fieldErrors?: FieldErrors;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(listingId: string) {
  revalidatePath("/owner", "layout");
  revalidatePath(`/owner/listings/${listingId}`);
}

function failed(context: string, err: unknown): ListingState {
  const f = reportError(context, err);
  return { status: "error", code: f.code, message: listingMessage(f.code), errorRef: f.reference };
}

/** Confirm that the availability shown to students is current (confirm_listing_availability refreshes "last updated"). */
export async function confirmAvailabilityAction(_prev: ListingState, form: FormData): Promise<ListingState> {
  const session = await requireRole("owner", "/owner/listings");
  const raw = form.get("listing_id");
  const listingId = typeof raw === "string" ? raw.trim() : "";
  if (!UUID.test(listingId)) return { status: "error", message: listingMessage("BAD_INPUT") };
  try {
    const supabase = await createClient();
    if (!(await ownerListingIds(supabase, session.userId)).includes(listingId)) {
      return { status: "error", code: "NOT_ALLOWED", message: listingMessage("NOT_ALLOWED") };
    }
    const { error } = await supabase.rpc("confirm_listing_availability", { p_listing: listingId });
    if (error) return failed("confirm availability", error);
    refresh(listingId);
    return { status: "success", message: "Availability confirmed. Students see it was updated today." };
  } catch (err) {
    unstable_rethrow(err);
    return failed("confirm availability", err);
  }
}

/**
 * Change one bed's state. Only the agreed moves that state_transitions also allows from the bed's CURRENT state, and
 * the update is guarded on that state, so a change made in the meantime is never overwritten.
 */
export async function changeBedStateAction(_prev: ListingState, form: FormData): Promise<ListingState> {
  const session = await requireRole("owner", "/owner/listings");
  const parsed = parseBedChange(form);
  if (!parsed.ok) return { status: "error", message: parsed.errors.form ?? parsed.errors.to ?? "Check the highlighted field.", fieldErrors: parsed.errors };
  const input = parsed.data;
  try {
    const supabase = await createClient();
    const [bed, mine] = await Promise.all([bedForChange(supabase, input.bedId), ownerListingIds(supabase, session.userId)]);
    if (!bed || bed.listing_id !== input.listingId || !mine.includes(bed.listing_id)) {
      return { status: "error", code: "NOT_ALLOWED", message: listingMessage("NOT_ALLOWED") };
    }
    const moves = ownerBedMoves(await transitionsFor(supabase, "bed"), bed.state);
    if (!moves.some((m) => m.to === input.to)) return { status: "error", code: "INVALID_TRANSITION", message: listingMessage("INVALID_TRANSITION") };

    const { data, error } = await supabase
      .from("beds")
      .update({ state: input.to, state_note: input.note })
      .eq("id", bed.id)
      .eq("state", bed.state)
      .select("id");
    if (error) return failed("change bed state", error);
    if (!data?.length) return { status: "error", code: "STATE_CHANGED", message: listingMessage("STATE_CHANGED") };
    refresh(input.listingId);
    return { status: "success", message: "Bed state saved." };
  } catch (err) {
    unstable_rethrow(err);
    return failed("change bed state", err);
  }
}

/** Change a room's price (rooms.price_zmw). */
export async function changeRoomPriceAction(_prev: ListingState, form: FormData): Promise<ListingState> {
  const session = await requireRole("owner", "/owner/listings");
  const parsed = parsePrice(form);
  if (!parsed.ok) return { status: "error", message: parsed.errors.form ?? parsed.errors.price, fieldErrors: parsed.errors };
  const input = parsed.data;
  try {
    const supabase = await createClient();
    const [listingId, mine] = await Promise.all([roomListing(supabase, input.roomId), ownerListingIds(supabase, session.userId)]);
    if (!listingId || listingId !== input.listingId || !mine.includes(listingId)) {
      return { status: "error", code: "NOT_ALLOWED", message: listingMessage("NOT_ALLOWED") };
    }
    const { error } = await supabase.from("rooms").update({ price_zmw: input.price }).eq("id", input.roomId);
    if (error) return failed("change room price", error);
    refresh(input.listingId);
    return { status: "success", message: "Price saved." };
  } catch (err) {
    unstable_rethrow(err);
    return failed("change room price", err);
  }
}
