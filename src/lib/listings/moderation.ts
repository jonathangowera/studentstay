/**
 * What the system administrator is offered on a listing (agreed for the demo). Pure and unit tested.
 * - Publish: only on a listing awaiting moderation (moderate_listing 'published').
 * - Suspend: with a note, when state_transitions allows it (moderate_listing 'suspended').
 * - Return to moderation: on a suspended or requires-review listing (submit_listing_for_moderation).
 */
import { MESSAGES } from "@/lib/errors";
import type { Parsed } from "@/lib/validation";
import { allowedMoves, type TransitionRow } from "@/lib/transitions";
import type { ModerationState } from "./labels";

export type ModerationMove = "publish" | "suspend" | "return";

export const MODERATION_MOVE: Record<ModerationMove, { label: string; title: string; note: "optional" | "required"; done: string }> = {
  publish: { label: "Publish", title: "Publish this listing?", note: "optional", done: "Published. Students can now see the listing." },
  suspend: { label: "Suspend", title: "Suspend this listing?", note: "required", done: "Suspended. Students can no longer see the listing and the owner was told." },
  return: {
    label: "Return to moderation",
    title: "Return this listing to moderation?",
    note: "optional",
    done: "Returned to moderation. It now waits to be published.",
  },
};

export function moderationMoves(rows: readonly TransitionRow[], state: ModerationState): ModerationMove[] {
  const allowed = allowedMoves(rows, "listing", state);
  const out: ModerationMove[] = [];
  if (state === "awaiting_moderation" && allowed.includes("published")) out.push("publish");
  if ((state === "suspended" || state === "requires_review") && allowed.includes("awaiting_moderation")) out.push("return");
  if (allowed.includes("suspended")) out.push("suspend");
  return out;
}

type FormLike = { get(name: string): unknown };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MODERATION_NOTE_MAX = 500;

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function parseModeration(form: FormLike): Parsed<{ listingId: string; move: ModerationMove; note: string | null }> {
  const listingId = text(form, "listing_id");
  const move = text(form, "move");
  const note = text(form, "note");
  if (!UUID.test(listingId) || !Object.hasOwn(MODERATION_MOVE, move)) return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  if (note.length > MODERATION_NOTE_MAX) return { ok: false, errors: { note: `Use ${MODERATION_NOTE_MAX} characters or fewer.` } };
  const m = move as ModerationMove;
  if (MODERATION_MOVE[m].note === "required" && !note) return { ok: false, errors: { note: "Give a reason. The owner sees it." } };
  return { ok: true, data: { listingId, move: m, note: note || null } };
}

export function moderationMessage(code: string): string {
  switch (code) {
    case "INVALID_TRANSITION":
      return "That change is not possible from the listing's current state. Refresh the page to see the latest state.";
    case "NOTE_REQUIRED":
      return "Give a reason. The owner sees it.";
    case "NOT_ALLOWED":
    case "42501":
      return "Only a system administrator can do that.";
    case "NOT_FOUND":
      return "We could not find that listing.";
    default:
      return MESSAGES[code] ?? "Something went wrong. Please try again.";
  }
}
