"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { MODERATION_MOVE, moderationMessage, moderationMoves, parseModeration } from "@/lib/listings/moderation";
import { listingModeration } from "@/server/system";
import { transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export type ModerationState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  errorRef?: string;
  fieldErrors?: FieldErrors;
};

/**
 * Publish (only from awaiting moderation), suspend (with a reason) or return a listing to moderation. Only the moves
 * state_transitions allows from the current state; moderate_listing and submit_listing_for_moderation check again.
 */
export async function moderateListingAction(_prev: ModerationState, form: FormData): Promise<ModerationState> {
  await requireRole("system_admin", "/system/listings");
  const parsed = parseModeration(form);
  if (!parsed.ok) return { status: "error", message: parsed.errors.form ?? "Check the highlighted field.", fieldErrors: parsed.errors };
  const input = parsed.data;

  try {
    const supabase = await createClient();
    const listing = await listingModeration(supabase, input.listingId);
    if (!listing) return { status: "error", code: "NOT_FOUND", message: moderationMessage("NOT_FOUND") };
    if (!moderationMoves(await transitionsFor(supabase, "listing"), listing.moderation).includes(input.move)) {
      return { status: "error", code: "INVALID_TRANSITION", message: moderationMessage("INVALID_TRANSITION") };
    }
    const { error } =
      input.move === "return"
        ? await supabase.rpc("submit_listing_for_moderation", { p_listing: listing.id })
        : await supabase.rpc("moderate_listing", {
            p_listing: listing.id,
            p_state: input.move === "publish" ? "published" : "suspended",
            ...(input.note ? { p_note: input.note } : {}),
          });
    if (error) {
      const f = reportError("moderate listing", error);
      return { status: "error", code: f.code, message: moderationMessage(f.code), errorRef: f.reference };
    }
    revalidatePath("/system", "layout");
    revalidatePath("/listings");
    return { status: "success", message: `${listing.name}: ${MODERATION_MOVE[input.move].done}` };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("moderate listing", err);
    return { status: "error", code: f.code, message: moderationMessage(f.code), errorRef: f.reference };
  }
}
