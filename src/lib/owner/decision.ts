/**
 * The owner's decision on a private application: validation, which statuses can be decided, and the order of
 * free beds offered for a hold. Pure and unit tested. decide_private_application checks everything again.
 */
import type { ApplicationStatus } from "@/lib/applications/status";
import type { RoomType } from "@/lib/listings/labels";
import type { Parsed } from "@/lib/validation";

/** decide_private_application refuses anything else with ALREADY_DECIDED. */
export const DECIDABLE: readonly ApplicationStatus[] = ["submitted", "under_review"];

export function canDecide(status: ApplicationStatus): boolean {
  return DECIDABLE.includes(status);
}

export const HOLD_MESSAGE = "A bed is held for 48 hours. The student must now pay the demonstration deposit to confirm it.";

export type OwnerDecision = "accepted" | "declined";

export type OwnerDecisionInput = {
  reference: string;
  applicationId: string;
  decision: OwnerDecision;
  bedId: string | null;
  note: string | null;
};

type FormLike = { get(name: string): unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE = /^APP-\d{4}-\d{4,}$/;
export const NOTE_MAX = 500;

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Accept needs a bed; Decline needs a reason. The message to the student is optional when accepting. */
export function parseOwnerDecision(form: FormLike): Parsed<OwnerDecisionInput> {
  const reference = text(form, "reference");
  const applicationId = text(form, "application_id");
  const decision = text(form, "decision");
  const bedId = text(form, "bed_id");
  const note = text(form, "note");
  if (!REFERENCE.test(reference) || !UUID.test(applicationId) || (decision !== "accepted" && decision !== "declined")) {
    return { ok: false, errors: { form: "Something went wrong. Refresh the page and try again." } };
  }
  if (note.length > NOTE_MAX) return { ok: false, errors: { note: `Use ${NOTE_MAX} characters or fewer.` } };
  if (decision === "accepted") {
    if (!UUID.test(bedId)) return { ok: false, errors: { bed_id: "Choose the bed to hold." } };
    return { ok: true, data: { reference, applicationId, decision, bedId, note: note || null } };
  }
  if (!note) return { ok: false, errors: { note: "Give a reason. The student sees it." } };
  return { ok: true, data: { reference, applicationId, decision, bedId: null, note } };
}

export type FreeBed = { id: string; label: string; roomNumber: string; roomType: RoomType; price: number };

const collator = new Intl.Collator("en", { numeric: true });

/** The requested room type first, then by room number (numerically) and bed label. */
export function orderFreeBeds(beds: readonly FreeBed[], requested: RoomType | null): FreeBed[] {
  return [...beds].sort((a, b) => {
    const ra = a.roomType === requested ? 0 : 1;
    const rb = b.roomType === requested ? 0 : 1;
    return ra - rb || collator.compare(a.roomNumber, b.roomNumber) || collator.compare(a.label, b.label);
  });
}
