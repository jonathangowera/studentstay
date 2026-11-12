"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { decideMessage, matchMessage } from "@/lib/allocation/messages";
import { isApplicationReference } from "@/lib/applications/rules";
import { isUuid } from "@/lib/listings/compare";
import { matchDeps } from "@/server/allocation/deps";
import { decide, runMatching, runMatchingForAll, type Actor, type Decision, type Timing } from "@/server/allocation/run";
import { requireRole } from "@/server/session";

export type AllocationState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** The error code, so the screen can react (for example the BED_UNAVAILABLE conflict dialog). */
  code?: string;
  errorRef?: string;
  timing?: Timing;
};

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function actorOf(session: Awaited<ReturnType<typeof requireRole>>): Actor {
  return { userId: session.userId, role: session.role, institutionId: session.profile.institution_id };
}

function refresh(reference?: string) {
  revalidatePath("/admin", "layout");
  if (reference) revalidatePath(`/admin/allocation/${reference}`);
}

/** Run matching for one submitted university allocation application. */
export async function runMatchingAction(_prev: AllocationState, form: FormData): Promise<AllocationState> {
  const reference = text(form, "reference");
  if (!isApplicationReference(reference)) return { status: "error", message: matchMessage("APPLICATION_NOT_FOUND") };
  const session = await requireRole("university_admin", `/admin/allocation/${reference}`);
  try {
    const out = await runMatching(await matchDeps(), actorOf(session), reference);
    if (!out.ok) {
      const f = out.error ? reportError("run matching", out.error) : null;
      return { status: "error", code: out.code, message: matchMessage(out.code), errorRef: f?.reference };
    }
    refresh(reference);
    return {
      status: "success",
      timing: out.timing,
      message:
        out.outcome === "recommended"
          ? `Matching finished. ${out.ranked} ${out.ranked === 1 ? "room is" : "rooms are"} ranked. The top one is recommended and waits for your decision.`
          : "Matching finished. No room met the hard requirements, so the application is now No eligible room.",
    };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("run matching", err);
    return { status: "error", message: matchMessage(f.code), errorRef: f.reference };
  }
}

/** Run matching for up to 25 submitted applications of the administrator's institution. */
export async function runMatchingForAllAction(): Promise<AllocationState> {
  const session = await requireRole("university_admin", "/admin");
  try {
    const out = await runMatchingForAll(await matchDeps(), actorOf(session));
    if ("error" in out) return { status: "error", code: out.error, message: matchMessage(out.error) };
    refresh();
    const done = out.recommended + out.noEligibleRoom + out.failed.length;
    if (done === 0) return { status: "success", message: "There are no submitted applications to match." };
    const parts = [
      `${out.recommended} recommended`,
      `${out.noEligibleRoom} with no eligible room`,
      `${out.failed.length} could not be matched${out.failed.length ? ` (${out.failed.map((f) => f.reference).join(", ")})` : ""}`,
    ];
    return {
      status: out.failed.length ? "error" : "success",
      message: `Matched ${done} ${done === 1 ? "application" : "applications"}: ${parts.join(", ")}.`,
      timing: { loadMs: 0, engineMs: 0, saveMs: 0, totalMs: out.totalMs },
    };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("run matching for all", err);
    return { status: "error", message: matchMessage(f.code), errorRef: f.reference };
  }
}

const DECISIONS: readonly Decision[] = ["approved", "modified", "rejected", "rerun"];

/** Approve, modify, reject or rerun a recommendation. Always the administrator's own session. */
export async function decideAllocationAction(_prev: AllocationState, form: FormData): Promise<AllocationState> {
  const reference = text(form, "reference");
  const runId = text(form, "run_id");
  const decision = text(form, "decision") as Decision;
  const bedId = text(form, "bed_id");
  const note = text(form, "note");
  const session = await requireRole("university_admin", isApplicationReference(reference) ? `/admin/allocation/${reference}` : "/admin");
  if (!isUuid(runId) || !DECISIONS.includes(decision) || (bedId && !isUuid(bedId))) return { status: "error", message: decideMessage("BAD_INPUT") };
  if (note.length > 500) return { status: "error", message: "Use 500 characters or fewer for the note." };

  try {
    const out = await decide(await matchDeps(), actorOf(session), { runId, decision, bedId: bedId || null, note: note || null });
    if (!out.ok) {
      const f = out.error ? reportError("decide allocation", out.error) : null;
      return { status: "error", code: out.code, message: decideMessage(out.code), errorRef: f?.reference };
    }
    refresh(out.reference);
    if (decision === "rerun") {
      const r = out.rerun;
      if (!r || !r.ok) {
        return {
          status: "error",
          code: r && !r.ok ? r.code : "UNKNOWN",
          message: `The application is back at Submitted. Matching did not finish: ${matchMessage(r && !r.ok ? r.code : "UNKNOWN")} You can run matching again.`,
        };
      }
      return {
        status: "success",
        timing: r.timing,
        message: r.outcome === "recommended" ? "Matching ran again. A new recommendation waits for your decision." : "Matching ran again. No room met the hard requirements.",
      };
    }
    const done: Record<Exclude<Decision, "rerun">, string> = {
      approved: "Approved. The bed is booked for the student.",
      modified: "Approved with your change. The chosen bed is booked for the student.",
      rejected: "Rejected. The bed was released and the student was told.",
    };
    return { status: "success", message: done[decision] };
  } catch (err) {
    unstable_rethrow(err);
    const f = reportError("decide allocation", err);
    return { status: "error", message: decideMessage(f.code), errorRef: f.reference };
  }
}

/** Confirm a student's number for the administrator's institution (confirm_student_number checks it again). */
export async function confirmStudentNumberAction(form: FormData): Promise<void> {
  const reference = text(form, "reference");
  const studentId = text(form, "student_id");
  const back = isApplicationReference(reference) ? `/admin/allocation/${reference}` : "/admin/applications";
  await requireRole("university_admin", back);
  if (!isUuid(studentId)) redirect(back);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_student_number", { p_student: studentId });
  if (error) redirect(`${back}?error=${reportError("confirm student number", error).reference}`);
  revalidatePath("/admin", "layout");
  redirect(`${back}?confirmed=1`);
}
