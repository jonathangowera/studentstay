import "server-only";

/**
 * The steps behind the apply wizard and withdraw. They take the Supabase client (the student's own session),
 * so tests can check the exact order of calls with a fake client. The server actions in
 * src/app/actions/applications.ts check the role and parse the form first.
 *
 * New application:   [university: save institution + student number to the profile] -> insert draft -> submit_application
 * Edit and resubmit: update the five allowed columns -> submit_application
 */
import { extractErrorCode } from "@/lib/errors";
import { canWithdraw, openApplicationTo, universityStartDecision } from "@/lib/applications/rules";
import { isEditable } from "@/lib/applications/status";
import { draftInsertFor, draftUpdateFor, profilePatchFor, type NewApplication, type Preferences } from "@/lib/applications/wizard";
import { applicationByReference, emailVerified, myApplications, placeForApply, withdrawTransitions, type Client } from "./applications";

export type ApplyOutcome =
  | { kind: "submitted" | "profile_incomplete"; reference: string; profileChanged: boolean }
  /** Stopped before anything was written. `reference` links to the application that is in the way. */
  | { kind: "blocked"; code: string; reference?: string }
  /** A database call failed. `reference` is set when a draft was already saved. */
  | { kind: "error"; code: string; error: unknown; reference?: string };

function fail(code: string, error: unknown, reference?: string): ApplyOutcome {
  return { kind: "error", code, error, reference };
}

async function submit(supabase: Client, appId: string, reference: string, profileChanged: boolean): Promise<ApplyOutcome> {
  const { data, error } = await supabase.rpc("submit_application", { p_app: appId });
  if (error) return fail(extractErrorCode(error), error, reference);
  return { kind: data === "profile_incomplete" ? "profile_incomplete" : "submitted", reference, profileChanged };
}

export async function applyNew(
  supabase: Client,
  student: { userId: string; profile: { institution_id: string | null; student_number: string | null } },
  app: NewApplication,
): Promise<ApplyOutcome> {
  if (!(await emailVerified(supabase))) return { kind: "blocked", code: "EMAIL_NOT_VERIFIED" };

  const mine = await myApplications(supabase, student.userId);
  if (app.route === "university_allocation") {
    const decision = universityStartDecision(mine);
    if (decision.kind !== "new") {
      return { kind: "blocked", code: decision.kind === "continue" ? "CONTINUE_APPLICATION" : "UNIVERSITY_APPLICATION_OPEN", reference: decision.app.reference };
    }
  } else {
    const open = openApplicationTo(mine, app.listing_id);
    if (open) return { kind: "blocked", code: "DUPLICATE_APPLICATION", reference: open.reference };
    if (!(await placeForApply(supabase, app.listing_id))) return { kind: "blocked", code: "PLACE_NOT_FOUND" };
  }

  // 1. submit_application reads institution and student number from the PROFILE, so save them there first.
  const patch = profilePatchFor(app, student.profile);
  if (patch) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", student.userId);
    if (error) return fail(extractErrorCode(error), error);
  }

  // 2. The draft, with only the columns the browser may insert.
  const { data: draft, error: insertError } = await supabase
    .from("applications")
    .insert(draftInsertFor(app, student.userId))
    .select("id, reference")
    .single();
  if (insertError || !draft) {
    const code = extractErrorCode(insertError);
    if (code === "DUPLICATE_APPLICATION" && app.route === "private") {
      const again = openApplicationTo(await myApplications(supabase, student.userId), app.listing_id);
      return { kind: "blocked", code, reference: again?.reference };
    }
    return fail(code, insertError);
  }

  // 3. Submit. The database decides submitted or profile_incomplete.
  return submit(supabase, draft.id, draft.reference, patch !== null);
}

export async function editAndResubmit(supabase: Client, studentId: string, reference: string, prefs: Preferences): Promise<ApplyOutcome> {
  if (!(await emailVerified(supabase))) return { kind: "blocked", code: "EMAIL_NOT_VERIFIED", reference };
  const app = await applicationByReference(supabase, studentId, reference);
  if (!app) return { kind: "blocked", code: "NOT_FOUND" };
  if (!isEditable(app.status)) return { kind: "blocked", code: "NOT_EDITABLE", reference };

  // Only the five columns the browser may update. Route and institution are fixed at creation.
  const { error } = await supabase.from("applications").update(draftUpdateFor(prefs)).eq("id", app.id).eq("student_id", studentId);
  if (error) return fail(extractErrorCode(error), error, reference);
  return submit(supabase, app.id, reference, false);
}

export type WithdrawOutcome = { ok: true } | { ok: false; code: string; error?: unknown };

export async function withdraw(supabase: Client, studentId: string, reference: string, reason: string | null): Promise<WithdrawOutcome> {
  const app = await applicationByReference(supabase, studentId, reference);
  if (!app) return { ok: false, code: "NOT_FOUND" };
  if (!canWithdraw(app.status, await withdrawTransitions(supabase))) return { ok: false, code: "WITHDRAW_NOT_ALLOWED" };
  const { error } = await supabase.rpc("withdraw_application", { p_app: app.id, p_reason: reason ?? undefined });
  if (error) {
    const code = extractErrorCode(error);
    return { ok: false, code: code === "INVALID_TRANSITION" ? "WITHDRAW_NOT_ALLOWED" : code, error };
  }
  return { ok: true };
}
