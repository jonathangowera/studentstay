"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { HOLD_MESSAGE, canDecide, parseOwnerDecision } from "@/lib/owner/decision";
import { ownerDecisionMessage } from "@/lib/owner/messages";
import { inboxRow } from "@/server/owner";
import { requireRole } from "@/server/session";

export type OwnerDecisionState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
  errorRef?: string;
  fieldErrors?: FieldErrors;
};

const REFERENCE = /^APP-\d{4}-\d{4,}$/;

/**
 * Accept (hold a bed for 48 hours) or decline a private application. The owner's own session only:
 * the inbox view shows only applications to their listings, and decide_private_application checks again.
 */
export async function decidePrivateApplicationAction(_prev: OwnerDecisionState, form: FormData): Promise<OwnerDecisionState> {
  const ref = form.get("reference");
  const reference = typeof ref === "string" && REFERENCE.test(ref.trim()) ? ref.trim() : null;
  await requireRole("owner", reference ? `/owner/applications/${reference}` : "/owner/applications");

  const parsed = parseOwnerDecision(form);
  if (!parsed.ok) {
    return { status: "error", message: parsed.errors.form ?? "Check the highlighted field.", fieldErrors: parsed.errors };
  }
  const input = parsed.data;

  try {
    const supabase = await createClient();
    const row = await inboxRow(supabase, input.reference);
    if (!row || row.id !== input.applicationId) return { status: "error", code: "APPLICATION_NOT_FOUND", message: ownerDecisionMessage("APPLICATION_NOT_FOUND") };
    if (!canDecide(row.status)) return { status: "error", code: "ALREADY_DECIDED", message: ownerDecisionMessage("ALREADY_DECIDED") };

    const { error } = await supabase.rpc("decide_private_application", {
      p_app: input.applicationId,
      p_decision: input.decision,
      ...(input.bedId ? { p_bed: input.bedId } : {}),
      ...(input.note ? { p_note: input.note } : {}),
    });
    if (error) {
      const f = reportError("decide private application", error);
      return { status: "error", code: f.code, message: ownerDecisionMessage(f.code), errorRef: f.reference };
    }
    revalidatePath("/owner", "layout");
    return {
      status: "success",
      message: input.decision === "accepted" ? `Accepted. ${HOLD_MESSAGE}` : "Declined. The student was told and can see your reason.",
    };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("decide private application", err);
    return { status: "error", code: f.code, message: ownerDecisionMessage(f.code), errorRef: f.reference };
  }
}
