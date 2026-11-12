import "server-only";

/**
 * Matching and decisions for a university administrator.
 *
 * Order for matching (never changed):
 *   1. the role and institution come from the session (requireRole in the action)
 *   2. with the administrator's OWN session (row-level security): read the application, check it is a university
 *      allocation of their institution and Submitted, and read the active rule
 *   3. only then: the service role loads the pool, the engine ranks, record_recommendation saves it
 * The service role never acts on something the administrator could not see.
 * Decisions always use the administrator's own session (decide_allocation checks them again).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { extractErrorCode } from "@/lib/errors";
import { recommend } from "@/lib/allocation/engine";
import type { EngineApplication, EngineRule } from "@/lib/allocation/types";
import { loadPool } from "./load";

type Client = SupabaseClient<Database>;

export type Actor = { userId: string; role: string; institutionId: string | null };

export type MatchDeps = {
  /** The administrator's own session. */
  user: Client;
  /** Creates the service-role client. Called only after every check in step 2 passed. */
  admin: () => Client;
  now?: () => Date;
  clock?: () => number;
};

export type Timing = { loadMs: number; engineMs: number; saveMs: number; totalMs: number };

export type MatchOutcome =
  | { ok: true; reference: string; runId: string; outcome: "recommended" | "no_eligible_room"; ranked: number; excluded: number; considered: number; timing: Timing }
  | { ok: false; reference: string; code: string; error?: unknown };

const APP_COLUMNS = "id, reference, route, status, institution_id, requested_room_type, budget_zmw, gender_needed, preferred_facilities" as const;
const RULE_COLUMNS = "id, name, version, hard_constraints, w_room_type, w_budget, w_distance, w_facilities, w_availability" as const;

export async function runMatching(deps: MatchDeps, actor: Actor, reference: string): Promise<MatchOutcome> {
  const fail = (code: string, error?: unknown): MatchOutcome => ({ ok: false, reference, code, error });
  if (actor.role !== "university_admin" || !actor.institutionId) return fail("NOT_ALLOWED");
  const clock = deps.clock ?? (() => performance.now());

  // Step 2: the administrator's own session.
  const { data: app, error: appError } = await deps.user.from("applications").select(APP_COLUMNS).eq("reference", reference).maybeSingle();
  if (appError) return fail(extractErrorCode(appError), appError);
  if (!app) return fail("APPLICATION_NOT_FOUND");
  if (app.institution_id !== actor.institutionId) return fail("NOT_ALLOWED");
  if (app.route !== "university_allocation") return fail("NOT_UNIVERSITY");
  if (app.status !== "submitted") return fail("NOT_SUBMITTED");
  if (!app.requested_room_type || app.budget_zmw === null || !app.gender_needed) return fail("APPLICATION_INCOMPLETE");

  const [ruleRes, instRes] = await Promise.all([
    deps.user.from("allocation_rules").select(RULE_COLUMNS).eq("institution_id", actor.institutionId).eq("active", true).maybeSingle(),
    deps.user.from("institutions").select("code").eq("id", actor.institutionId).maybeSingle(),
  ]);
  if (ruleRes.error) return fail(extractErrorCode(ruleRes.error), ruleRes.error);
  if (instRes.error) return fail(extractErrorCode(instRes.error), instRes.error);
  const r = ruleRes.data;
  if (!r) return fail("RULE_NOT_ACTIVE");

  const rule: EngineRule = {
    id: r.id,
    name: r.name,
    version: r.version,
    weights: { roomType: r.w_room_type, budget: r.w_budget, distance: r.w_distance, facilities: r.w_facilities, availability: r.w_availability },
    hardConstraints: r.hard_constraints,
  };
  const application: EngineApplication = {
    id: app.id,
    institutionCode: instRes.data?.code ?? "campus",
    roomType: app.requested_room_type,
    budget: Number(app.budget_zmw),
    gender: app.gender_needed,
    facilities: app.preferred_facilities ?? [],
  };

  // Step 3: only now the service role.
  const service = deps.admin();
  const t0 = clock();
  let rooms;
  try {
    rooms = await loadPool(service, actor.institutionId);
  } catch (err) {
    return fail(extractErrorCode(err), err);
  }
  const t1 = clock();
  const result = recommend({ application, rule, rooms, now: deps.now?.() ?? new Date() });
  const t2 = clock();
  const { data: runId, error: saveError } = await service.rpc("record_recommendation", {
    p_app: app.id,
    p_rule: rule.id,
    p_explanation: result.explanation,
    p_candidates: result.candidates,
    p_run_by: actor.userId,
  });
  const t3 = clock();
  if (saveError || !runId) return fail(saveError ? extractErrorCode(saveError) : "UNKNOWN", saveError);

  const round = (x: number) => Math.round(x);
  return {
    ok: true,
    reference,
    runId,
    outcome: result.ranked.length ? "recommended" : "no_eligible_room",
    ranked: result.ranked.length,
    excluded: result.failCounts ? Object.values(result.failCounts).reduce((a, b) => a + b, 0) : 0,
    considered: result.considered,
    timing: { loadMs: round(t1 - t0), engineMs: round(t2 - t1), saveMs: round(t3 - t2), totalMs: round(t3 - t0) },
  };
}

/** Up to this many applications per "Run matching for all submitted". */
export const BATCH_LIMIT = 25;

export type BatchOutcome = { recommended: number; noEligibleRoom: number; failed: { reference: string; code: string }[]; totalMs: number };

/** Matches the institution's submitted university applications, oldest first, one after another. */
export async function runMatchingForAll(deps: MatchDeps, actor: Actor): Promise<BatchOutcome | { error: string }> {
  if (actor.role !== "university_admin" || !actor.institutionId) return { error: "NOT_ALLOWED" };
  const { data, error } = await deps.user
    .from("applications")
    .select("reference")
    .eq("institution_id", actor.institutionId)
    .eq("route", "university_allocation")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (error) return { error: extractErrorCode(error) };
  const out: BatchOutcome = { recommended: 0, noEligibleRoom: 0, failed: [], totalMs: 0 };
  for (const { reference } of data ?? []) {
    const r = await runMatching(deps, actor, reference);
    if (r.ok) {
      out.totalMs += r.timing.totalMs;
      if (r.outcome === "recommended") out.recommended++;
      else out.noEligibleRoom++;
    } else out.failed.push({ reference, code: r.code });
  }
  return out;
}

// ---------------------------------------------------------------- decisions

export type Decision = "approved" | "modified" | "rejected" | "rerun";

export type DecideInput = { runId: string; decision: Decision; bedId: string | null; note: string | null };

export type DecideOutcome =
  | { ok: true; reference: string; rerun?: MatchOutcome }
  | { ok: false; code: string; reference?: string; error?: unknown };

/** decide_allocation with the administrator's OWN session. Rerun sends it back to Submitted and matches again. */
export async function decide(deps: MatchDeps, actor: Actor, input: DecideInput): Promise<DecideOutcome> {
  if (actor.role !== "university_admin" || !actor.institutionId) return { ok: false, code: "NOT_ALLOWED" };
  if ((input.decision === "modified" || input.decision === "rejected") && !input.note?.trim()) return { ok: false, code: "NOTE_REQUIRED" };
  if (input.decision === "modified" && !input.bedId) return { ok: false, code: "BED_REQUIRED" };

  const { data: run, error: runError } = await deps.user
    .from("allocation_runs")
    .select("id, applications!inner(reference, institution_id)")
    .eq("id", input.runId)
    .maybeSingle();
  if (runError) return { ok: false, code: extractErrorCode(runError), error: runError };
  const app = run?.applications as unknown as { reference: string; institution_id: string | null } | undefined;
  if (!run || !app) return { ok: false, code: "RUN_NOT_FOUND" };
  if (app.institution_id !== actor.institutionId) return { ok: false, code: "NOT_ALLOWED", reference: app.reference };

  const { error } = await deps.user.rpc("decide_allocation", {
    p_run: input.runId,
    p_decision: input.decision,
    p_bed: input.decision === "modified" ? (input.bedId ?? undefined) : undefined,
    p_note: input.note?.trim() || undefined,
  });
  if (error) return { ok: false, code: extractErrorCode(error), reference: app.reference, error };

  if (input.decision === "rerun") {
    return { ok: true, reference: app.reference, rerun: await runMatching(deps, actor, app.reference) };
  }
  return { ok: true, reference: app.reference };
}
