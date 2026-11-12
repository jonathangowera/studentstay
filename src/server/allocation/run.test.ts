import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decide, runMatching, runMatchingForAll, type Actor, type MatchDeps } from "./run";
import { toEngineRooms } from "./load";

type Call = { who: "user" | "service"; table?: string; rpc?: string; payload?: unknown; filters: string[] };
type Reply = { data?: unknown; error?: unknown };

/** A fake Supabase client that records every query in one shared log, in order. */
function fake(who: Call["who"], log: Call[], reply: (c: Call) => Reply) {
  const builder = (call: Call) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit", "maybeSingle", "single"]) {
      b[m] = (...args: unknown[]) => {
        if (m !== "select") call.filters.push(`${m}:${args.map((a) => JSON.stringify(a)).join(",")}`);
        return b;
      };
    }
    b.then = (resolve: (r: Reply) => unknown) => resolve({ data: null, error: null, ...reply(call) });
    return b;
  };
  return {
    from(table: string) {
      const call: Call = { who, table, filters: [] };
      log.push(call);
      return builder(call);
    },
    rpc(name: string, payload: unknown) {
      const call: Call = { who, rpc: name, payload, filters: [] };
      log.push(call);
      return builder(call);
    },
  };
}

const UNZA = "inst-unza";
const admin: Actor = { userId: "admin-1", role: "university_admin", institutionId: UNZA };
const APP = {
  id: "app-1",
  reference: "APP-2026-0500",
  route: "university_allocation",
  status: "submitted",
  institution_id: UNZA,
  requested_room_type: "double",
  budget_zmw: 2000,
  gender_needed: "female_only",
  preferred_facilities: ["wifi"],
};
const RULE = { id: "rule-1", name: "UNZA", version: 3, hard_constraints: {}, w_room_type: 25, w_budget: 25, w_distance: 25, w_facilities: 15, w_availability: 10 };
const POOL = [
  {
    distance_km: 0.3,
    partnered: true,
    listings: {
      id: "l1",
      name: "Riverside Hall",
      rent_unit: "term",
      gender: "mixed",
      facilities: ["wifi"],
      last_updated_at: "2026-11-13T06:00:00Z",
      moderation: "published",
      rooms: [
        { id: "r309", room_number: "309", room_type: "double", price_zmw: 4400, wing: "Block 3", gender: "female_only", beds: [{ id: "b1", label: "A", state: "available", held_for_application_id: null }] },
        { id: "r201", room_number: "201", room_type: "double", price_zmw: 4400, wing: "Block 2", gender: "male_only", beds: [{ id: "b2", label: "A", state: "available", held_for_application_id: null }] },
      ],
    },
  },
];

/** Deps with default replies; `over` can change any reply. */
function setup(over: (c: Call) => Reply | undefined = () => undefined) {
  const log: Call[] = [];
  const reply = (c: Call): Reply => {
    const o = over(c);
    if (o) return o;
    if (c.table === "applications") return { data: APP };
    if (c.table === "allocation_rules") return { data: RULE };
    if (c.table === "institutions") return { data: { code: "UNZA" } };
    if (c.table === "listing_distances") return { data: POOL };
    if (c.rpc === "record_recommendation") return { data: "run-1" };
    if (c.table === "allocation_runs") return { data: { id: "run-1", applications: { reference: APP.reference, institution_id: UNZA } } };
    return { data: null };
  };
  let serviceCreated = -1;
  const deps: MatchDeps = {
    user: fake("user", log, reply) as never,
    admin: () => {
      serviceCreated = log.length;
      return fake("service", log, reply) as never;
    },
    now: () => new Date("2026-11-13T08:00:00Z"),
  };
  return { deps, log, serviceCreatedAt: () => serviceCreated };
}

describe("runMatching: authorisation before the service role", () => {
  it("refuses a student without reading anything", async () => {
    const s = setup();
    expect(await runMatching(s.deps, { ...admin, role: "student" }, APP.reference)).toMatchObject({ ok: false, code: "NOT_ALLOWED" });
    expect(s.log).toEqual([]);
    expect(s.serviceCreatedAt()).toBe(-1);
  });

  it("refuses an administrator of another institution and never creates the service role", async () => {
    const s = setup();
    const other = { ...admin, institutionId: "inst-other" };
    expect(await runMatching(s.deps, other, APP.reference)).toMatchObject({ ok: false, code: "NOT_ALLOWED" });
    expect(s.serviceCreatedAt()).toBe(-1);
    expect(s.log.every((c) => c.who === "user")).toBe(true);
  });

  it("treats an application the administrator cannot see as not found", async () => {
    const s = setup((c) => (c.table === "applications" ? { data: null } : undefined));
    expect(await runMatching(s.deps, admin, APP.reference)).toMatchObject({ ok: false, code: "APPLICATION_NOT_FOUND" });
    expect(s.serviceCreatedAt()).toBe(-1);
  });

  it.each([
    [{ route: "private" }, "NOT_UNIVERSITY"],
    [{ status: "pending_approval" }, "NOT_SUBMITTED"],
    [{ gender_needed: null }, "APPLICATION_INCOMPLETE"],
  ])("stops %j with %s before the service role", async (patch, code) => {
    const s = setup((c) => (c.table === "applications" ? { data: { ...APP, ...patch } } : undefined));
    expect(await runMatching(s.deps, admin, APP.reference)).toMatchObject({ ok: false, code });
    expect(s.serviceCreatedAt()).toBe(-1);
  });

  it("needs an active rule readable by the administrator", async () => {
    const s = setup((c) => (c.table === "allocation_rules" ? { data: null } : undefined));
    expect(await runMatching(s.deps, admin, APP.reference)).toMatchObject({ ok: false, code: "RULE_NOT_ACTIVE" });
    expect(s.serviceCreatedAt()).toBe(-1);
  });
});

describe("runMatching: the happy path", () => {
  it("reads with the administrator's session first, then loads and saves with the service role", async () => {
    const s = setup();
    const out = await runMatching(s.deps, admin, APP.reference);
    expect(out).toMatchObject({ ok: true, runId: "run-1", outcome: "recommended", ranked: 1, excluded: 1, considered: 2 });
    expect(s.log.map((c) => `${c.who}:${c.table ?? c.rpc}`)).toEqual([
      "user:applications",
      "user:allocation_rules",
      "user:institutions",
      "service:listing_distances",
      "service:record_recommendation",
    ]);
    expect(s.serviceCreatedAt()).toBe(3);
    const user = s.log.filter((c) => c.who === "user");
    expect(user[1].filters).toEqual(expect.arrayContaining(['eq:"institution_id","inst-unza"', 'eq:"active",true']));
  });

  it("sends record_recommendation the run_by, the rule, the explanation and the candidate rows", async () => {
    const s = setup();
    await runMatching(s.deps, admin, APP.reference);
    const payload = s.log.find((c) => c.rpc === "record_recommendation")!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ p_app: "app-1", p_rule: "rule-1", p_run_by: "admin-1" });
    expect(payload.p_explanation).toContain("Rule UNZA, version 3.");
    const rows = payload.p_candidates as { room_id: string; excluded: boolean; rank: number | null; exclusion_reason: string | null }[];
    expect(rows.map((r) => [r.room_id, r.excluded, r.rank, r.exclusion_reason])).toEqual([
      ["r309", false, 1, null],
      ["r201", true, null, "Gender policy: male only"],
    ]);
  });

  it("reports the timing of each step", async () => {
    const s = setup();
    let t = 0;
    const out = await runMatching({ ...s.deps, clock: () => (t += 10) }, admin, APP.reference);
    expect(out.ok && out.timing).toEqual({ loadMs: 10, engineMs: 10, saveMs: 10, totalMs: 30 });
  });

  it("reports no eligible room", async () => {
    const s = setup((c) => (c.table === "applications" ? { data: { ...APP, gender_needed: "mixed" } } : undefined));
    expect(await runMatching(s.deps, admin, APP.reference)).toMatchObject({ ok: true, outcome: "no_eligible_room", ranked: 0 });
  });

  it.each(["RULE_NOT_ACTIVE", "BED_UNAVAILABLE", "INVALID_TRANSITION", "NOT_UNIVERSITY", "NOT_ALLOWED"])(
    "maps %s from record_recommendation by the code before the colon",
    async (code) => {
      const s = setup((c) => (c.rpc === "record_recommendation" ? { error: { code: "P0001", message: `${code}: detail` } } : undefined));
      expect(await runMatching(s.deps, admin, APP.reference)).toMatchObject({ ok: false, code });
    },
  );
});

describe("runMatchingForAll", () => {
  it("matches up to 25 submitted applications of the institution, one after another, and counts the outcomes", async () => {
    let n = 0;
    const s = setup((c) => {
      if (c.table === "applications" && c.filters.some((f) => f.startsWith("limit"))) {
        return { data: [{ reference: "APP-2026-0001" }, { reference: "APP-2026-0002" }, { reference: "APP-2026-0003" }] };
      }
      if (c.rpc === "record_recommendation") {
        n++;
        if (n === 2) return { error: { code: "P0001", message: "BED_UNAVAILABLE: taken" } };
      }
      return undefined;
    });
    const out = await runMatchingForAll(s.deps, admin);
    expect(out).toMatchObject({ recommended: 2, noEligibleRoom: 0, failed: [{ reference: "APP-2026-0002", code: "BED_UNAVAILABLE" }] });
    const list = s.log.find((c) => c.filters.some((f) => f.startsWith("limit")))!;
    expect(list.filters).toEqual(expect.arrayContaining(['eq:"status","submitted"', 'eq:"route","university_allocation"', "limit:25"]));
  });

  it("refuses anyone but a university administrator", async () => {
    const s = setup();
    expect(await runMatchingForAll(s.deps, { ...admin, role: "system_admin" })).toEqual({ error: "NOT_ALLOWED" });
    expect(s.log).toEqual([]);
  });
});

describe("decide", () => {
  it("calls decide_allocation with the administrator's own session, never the service role", async () => {
    const s = setup();
    expect(await decide(s.deps, admin, { runId: "run-1", decision: "approved", bedId: null, note: null })).toEqual({ ok: true, reference: APP.reference });
    expect(s.serviceCreatedAt()).toBe(-1);
    const rpc = s.log.find((c) => c.rpc === "decide_allocation")!;
    expect(rpc.who).toBe("user");
    expect(rpc.payload).toEqual({ p_run: "run-1", p_decision: "approved", p_bed: undefined, p_note: undefined });
  });

  it("needs a note to modify or reject, and a bed to modify, before calling the database", async () => {
    const s = setup();
    expect(await decide(s.deps, admin, { runId: "run-1", decision: "rejected", bedId: null, note: "  " })).toMatchObject({ code: "NOTE_REQUIRED" });
    expect(await decide(s.deps, admin, { runId: "run-1", decision: "modified", bedId: null, note: "Closer to class" })).toMatchObject({ code: "BED_REQUIRED" });
    expect(s.log).toEqual([]);
  });

  it("sends the chosen bed and the note when modifying", async () => {
    const s = setup();
    await decide(s.deps, admin, { runId: "run-1", decision: "modified", bedId: "b9", note: " Next eligible room " });
    expect(s.log.find((c) => c.rpc)!.payload).toEqual({ p_run: "run-1", p_decision: "modified", p_bed: "b9", p_note: "Next eligible room" });
  });

  it("refuses a run of another institution", async () => {
    const s = setup((c) => (c.table === "allocation_runs" ? { data: { id: "run-1", applications: { reference: "X", institution_id: "inst-other" } } } : undefined));
    expect(await decide(s.deps, admin, { runId: "run-1", decision: "approved", bedId: null, note: null })).toMatchObject({ ok: false, code: "NOT_ALLOWED" });
    expect(s.log.some((c) => c.rpc)).toBe(false);
  });

  it.each(["NOTE_REQUIRED", "BED_NOT_ELIGIBLE", "BED_UNAVAILABLE", "ALREADY_DECIDED"])("maps %s from decide_allocation", async (code) => {
    const s = setup((c) => (c.rpc === "decide_allocation" ? { error: { code: "P0001", message: `${code}: detail` } } : undefined));
    expect(await decide(s.deps, admin, { runId: "run-1", decision: "approved", bedId: null, note: null })).toMatchObject({ ok: false, code });
  });

  it("reruns: sends it back to Submitted, then matches again", async () => {
    const s = setup();
    const out = await decide(s.deps, admin, { runId: "run-1", decision: "rerun", bedId: null, note: null });
    expect(out).toMatchObject({ ok: true, rerun: { ok: true, outcome: "recommended" } });
    const order = s.log.map((c) => `${c.who}:${c.table ?? c.rpc}`);
    expect(order.indexOf("user:decide_allocation")).toBeLessThan(order.indexOf("service:record_recommendation"));
  });
});

describe("toEngineRooms", () => {
  it("maps the nested rows and skips unpublished listings", () => {
    const rooms = toEngineRooms([...POOL, { ...POOL[0], listings: { ...POOL[0].listings, id: "l2", moderation: "draft" } }] as never);
    expect(rooms.map((r) => r.id)).toEqual(["r309", "r201"]);
    expect(rooms[0]).toMatchObject({ number: "309", price: 4400, listing: { rentUnit: "term", distanceKm: 0.3, partnered: true } });
    expect(rooms[0].beds[0]).toEqual({ id: "b1", label: "A", state: "available", heldForApplicationId: null });
  });
});
