"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/validation";
import { applyNotice, withdrawNotice, type Notice } from "@/lib/applications/messages";
import { isApplicationReference } from "@/lib/applications/rules";
import { confirmedDetails, parseApplicationEdit, parseNewApplication } from "@/lib/applications/wizard";
import { isUuid } from "@/lib/listings/compare";
import { allInstitutions } from "@/server/applications";
import { applyNew, editAndResubmit, withdraw, type ApplyOutcome } from "@/server/apply";
import { requireRole } from "@/server/session";

export type ApplyState = {
  status: "idle" | "error";
  notice?: Notice;
  /** Reference code for a database error, to quote to support. */
  errorRef?: string;
  errors?: FieldErrors;
};

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateStudent(listingId?: string | null) {
  revalidatePath("/student", "layout");
  if (listingId) {
    revalidatePath(`/listings/${listingId}`);
    revalidatePath(`/listings/${listingId}/availability`);
  }
}

/**
 * The apply wizard's Submit. Everything is checked again here; nothing from the form is trusted.
 * mode=new: a new application. mode=edit: a draft or profile incomplete one, by reference.
 */
export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const mode = text(form, "mode") === "edit" ? "edit" : "new";
  const reference = text(form, "reference");
  const session = await requireRole("student", mode === "edit" && isApplicationReference(reference) ? `/apply?application=${reference}` : "/apply");
  const supabase = await createClient();

  if (!confirmedDetails(form)) {
    return { status: "error", errors: { confirm: "Tick the box to confirm your details." }, notice: { message: "Check the highlighted fields." } };
  }

  let outcome: ApplyOutcome;
  let listingId: string | null = null;
  try {
    if (mode === "edit") {
      if (!isApplicationReference(reference)) return { status: "error", notice: applyNotice("NOT_FOUND") };
      const parsed = parseApplicationEdit(form);
      if (!parsed.ok) return { status: "error", errors: parsed.errors, notice: { message: "Check the highlighted fields." } };
      outcome = await editAndResubmit(supabase, session.userId, reference, parsed.data);
    } else {
      const raw = text(form, "listing_id");
      listingId = isUuid(raw) ? raw : null;
      const active = (await allInstitutions(supabase)).filter((i) => i.status === "active").map((i) => i.id);
      const parsed = parseNewApplication(form, { activeInstitutionIds: active, listingId });
      if (!parsed.ok) return { status: "error", errors: parsed.errors, notice: { message: "Check the highlighted fields." } };
      outcome = await applyNew(supabase, { userId: session.userId, profile: session.profile }, parsed.data);
    }
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("submit application", err);
    return { status: "error", notice: { message: f.message }, errorRef: f.reference };
  }

  if (outcome.kind === "submitted" || outcome.kind === "profile_incomplete") {
    revalidateStudent(listingId);
    const q = new URLSearchParams({ done: outcome.kind });
    if (outcome.profileChanged) q.set("profile", "saved");
    redirect(`/student/applications/${outcome.reference}?${q}`);
  }
  if (outcome.kind === "blocked") return { status: "error", notice: applyNotice(outcome.code, outcome.reference) };
  if (outcome.kind !== "error") return { status: "idle" };

  const f = reportError("submit application", outcome.error);
  if (outcome.reference) revalidateStudent(listingId);
  return { status: "error", notice: applyNotice(outcome.code, outcome.reference), errorRef: f.reference };
}

export type WithdrawState = { status: "idle" | "error"; message?: string; errorRef?: string };

export async function withdrawApplication(_prev: WithdrawState, form: FormData): Promise<WithdrawState> {
  const reference = text(form, "reference");
  if (!isApplicationReference(reference)) return { status: "error", message: withdrawNotice("NOT_FOUND").message };
  const session = await requireRole("student", `/student/applications/${reference}`);

  const reason = text(form, "reason");
  if (reason.length > 500) return { status: "error", message: "Use 500 characters or fewer for the reason." };

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof withdraw>>;
  try {
    result = await withdraw(supabase, session.userId, reference, reason || null);
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("withdraw application", err);
    return { status: "error", message: f.message, errorRef: f.reference };
  }
  if (!result.ok) {
    const f = result.error ? reportError("withdraw application", result.error) : null;
    return { status: "error", message: withdrawNotice(result.code).message, errorRef: f?.reference };
  }
  revalidatePath("/student", "layout");
  revalidatePath("/listings", "layout");
  redirect(`/student/applications/${reference}?done=withdrawn`);
}
