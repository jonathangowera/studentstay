import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { applyNew, editAndResubmit, withdraw } from "./apply";
import type { NewApplication } from "@/lib/applications/wizard";

type Call = { table?: string; rpc?: string; op: string; payload?: unknown; filters: string[] };
type Reply = { data?: unknown; error?: unknown; count?: number };

/**
 * A fake Supabase client. Every query is recorded in order; `reply` decides what each one returns.
 * Enough of the builder for the calls in src/server/apply.ts and src/server/applications.ts.
 */
function fakeClient(reply: (c: Call) => Reply) {
  const calls: Call[] = [];
  const builder = (call: Call) => {
    const b: Record<string, unknown> = {};
    const chain = (name: string) => (...args: unknown[]) => {
      if (["select", "insert", "update", "delete"].includes(name) && call.op === "select" && name !== "select") call.op = name;
      if (name === "insert" || name === "update") {
        call.op = name;
        call.payload = args[0];
      } else if (name !== "select") call.filters.push(`${name}:${args.map((a) => JSON.stringify(a)).join(",")}`);
      return b;
    };
    for (const m of ["select", "insert", "update", "eq", "in", "is", "order", "limit", "maybeSingle", "single"]) b[m] = chain(m);
    b.then = (resolve: (r: Reply) => unknown) => resolve({ data: null, error: null, ...reply(call) });
    return b;
  };
  return {
    calls,
    client: {
      from(table: string) {
        const call: Call = { table, op: "select", filters: [] };
        calls.push(call);
        return builder(call);
      },
      rpc(name: string, args: unknown) {
        const call: Call = { rpc: name, op: "rpc", payload: args, filters: [] };
        calls.push(call);
        return builder(call);
      },
    },
  };
}

const UNZA = "11111111-1111-4111-8111-111111111111";
const PLACE = "33333333-3333-4333-8333-333333333333";
const prefs = {
  requested_room_type: "double" as const,
  budget_zmw: 1500,
  gender_needed: "female_only" as const,
  intake: "Semester I 2027" as const,
  preferred_facilities: ["wifi"],
};
const uni: NewApplication = { ...prefs, route: "university_allocation", institution_id: UNZA, student_number: "108-397", listing_id: null };
const priv: NewApplication = { ...prefs, route: "private", listing_id: PLACE, institution_id: null, student_number: null };
const student = { userId: "student-1", profile: { institution_id: null, student_number: null } };

/** Happy-path replies: email verified, no applications yet, draft created, submitted. */
function happy(over: (c: Call) => Reply | undefined = () => undefined) {
  return (c: Call): Reply => {
    const o = over(c);
    if (o) return o;
    if (c.rpc === "email_verified") return { data: true };
    if (c.rpc === "submit_application") return { data: "submitted" };
    if (c.table === "applications" && c.op === "select") return { data: [] };
    if (c.table === "applications" && c.op === "insert") return { data: { id: "app-1", reference: "APP-2026-0500" } };
    if (c.table === "listing_cards") return { data: { id: PLACE, name: "Chelston Gardens Rooms", area: "Chelston", type: "private_rental", gender: "mixed", rent_unit: "month" } };
    if (c.table === "rooms") return { data: [] };
    return { data: null };
  };
}

const writes = (calls: Call[]) => calls.filter((c) => c.op !== "select" && c.rpc !== "email_verified").map((c) => c.rpc ?? `${c.op} ${c.table}`);

describe("applyNew: university allocation (correction A)", () => {
  it("saves the profile first, then inserts the draft, then submits", async () => {
    const { client, calls } = fakeClient(happy());
    const out = await applyNew(client as never, student, uni);
    expect(out).toEqual({ kind: "submitted", reference: "APP-2026-0500", profileChanged: true });
    expect(writes(calls)).toEqual(["update profiles", "insert applications", "submit_application"]);
    expect(calls.find((c) => c.op === "update")!.payload).toEqual({ institution_id: UNZA, student_number: "108-397" });
    expect(calls.find((c) => c.rpc === "submit_application")!.payload).toEqual({ p_app: "app-1" });
  });

  it("skips the profile update when nothing changed", async () => {
    const { client, calls } = fakeClient(happy());
    const out = await applyNew(client as never, { ...student, profile: { institution_id: UNZA, student_number: "108-397" } }, uni);
    expect(out).toMatchObject({ kind: "submitted", profileChanged: false });
    expect(writes(calls)).toEqual(["insert applications", "submit_application"]);
  });

  it("inserts only the allowed columns, never status", async () => {
    const { client, calls } = fakeClient(happy());
    await applyNew(client as never, student, uni);
    const row = calls.find((c) => c.op === "insert")!.payload as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(
      ["budget_zmw", "gender_needed", "institution_id", "intake", "listing_id", "preferred_facilities", "requested_room_type", "route", "student_id"],
    );
  });

  it("returns profile_incomplete from the database", async () => {
    const { client } = fakeClient(happy((c) => (c.rpc === "submit_application" ? { data: "profile_incomplete" } : undefined)));
    expect(await applyNew(client as never, student, uni)).toMatchObject({ kind: "profile_incomplete", reference: "APP-2026-0500" });
  });

  it("blocks a second open university application before writing anything", async () => {
    const open = [{ id: "a", reference: "APP-2026-0412", route: "university_allocation", status: "pending_approval", created_at: "2026-11-11T07:00:00Z", listing_id: null, budget_zmw: 2000 }];
    const { client, calls } = fakeClient(happy((c) => (c.table === "applications" && c.op === "select" ? { data: open } : undefined)));
    expect(await applyNew(client as never, student, uni)).toEqual({ kind: "blocked", code: "UNIVERSITY_APPLICATION_OPEN", reference: "APP-2026-0412" });
    expect(writes(calls)).toEqual([]);
  });

  it("sends the student back to a draft instead of creating another", async () => {
    const open = [{ id: "a", reference: "APP-2026-0499", route: "university_allocation", status: "draft", created_at: "2026-11-11T07:00:00Z", listing_id: null, budget_zmw: null }];
    const { client, calls } = fakeClient(happy((c) => (c.table === "applications" && c.op === "select" ? { data: open } : undefined)));
    expect(await applyNew(client as never, student, uni)).toEqual({ kind: "blocked", code: "CONTINUE_APPLICATION", reference: "APP-2026-0499" });
    expect(writes(calls)).toEqual([]);
  });

  it("stops when the email is not verified", async () => {
    const { client, calls } = fakeClient(happy((c) => (c.rpc === "email_verified" ? { data: false } : undefined)));
    expect(await applyNew(client as never, student, uni)).toEqual({ kind: "blocked", code: "EMAIL_NOT_VERIFIED" });
    expect(writes(calls)).toEqual([]);
  });

  it("reports a student number that cannot be used without inserting a draft", async () => {
    const taken = { code: "23505", message: 'duplicate key value violates unique constraint "profiles_student_number_uq"' };
    const { client, calls } = fakeClient(happy((c) => (c.table === "profiles" ? { error: taken } : undefined)));
    expect(await applyNew(client as never, student, uni)).toMatchObject({ kind: "error", code: "STUDENT_NUMBER_TAKEN" });
    expect(writes(calls)).toEqual(["update profiles"]);
  });

  it("keeps the draft reference when submit fails", async () => {
    const err = { code: "42501", message: "EMAIL_NOT_VERIFIED: verify your email before applying" };
    const { client } = fakeClient(happy((c) => (c.rpc === "submit_application" ? { error: err } : undefined)));
    expect(await applyNew(client as never, student, uni)).toMatchObject({ kind: "error", code: "EMAIL_NOT_VERIFIED", reference: "APP-2026-0500" });
  });
});

describe("applyNew: private application", () => {
  it("never touches the profile", async () => {
    const { client, calls } = fakeClient(happy());
    expect(await applyNew(client as never, student, priv)).toMatchObject({ kind: "submitted", profileChanged: false });
    expect(writes(calls)).toEqual(["insert applications", "submit_application"]);
  });

  it("maps the database duplicate rule to the open application", async () => {
    const dup = { code: "23505", message: 'duplicate key value violates unique constraint "applications_one_open_per_listing"' };
    let selects = 0;
    const { client } = fakeClient(
      happy((c) => {
        if (c.table === "applications" && c.op === "insert") return { error: dup };
        if (c.table === "applications" && c.op === "select") {
          selects++;
          // The first read misses it (a race); the read after the duplicate error finds it.
          return selects === 1
            ? { data: [] }
            : { data: [{ id: "x", reference: "APP-2026-0301", route: "private", status: "under_review", created_at: "2026-11-01T00:00:00Z", listing_id: PLACE, budget_zmw: 1 }] };
        }
        return undefined;
      }),
    );
    expect(await applyNew(client as never, student, priv)).toEqual({ kind: "blocked", code: "DUPLICATE_APPLICATION", reference: "APP-2026-0301" });
  });

  it("refuses a place that is not published", async () => {
    const { client, calls } = fakeClient(happy((c) => (c.table === "listing_cards" ? { data: null } : undefined)));
    expect(await applyNew(client as never, student, priv)).toEqual({ kind: "blocked", code: "PLACE_NOT_FOUND" });
    expect(writes(calls)).toEqual([]);
  });
});

describe("editAndResubmit (correction B)", () => {
  const draft = { id: "app-9", reference: "APP-2026-0499", route: "university_allocation", status: "profile_incomplete", budget_zmw: null };

  it("updates only the five allowed columns, then submits", async () => {
    const { client, calls } = fakeClient(happy((c) => (c.table === "applications" && c.op === "select" ? { data: draft } : undefined)));
    expect(await editAndResubmit(client as never, "student-1", "APP-2026-0499", prefs)).toMatchObject({ kind: "submitted" });
    expect(writes(calls)).toEqual(["update applications", "submit_application"]);
    const update = calls.find((c) => c.op === "update")!;
    expect(Object.keys(update.payload as object).sort()).toEqual(["budget_zmw", "gender_needed", "intake", "preferred_facilities", "requested_room_type"]);
    expect(update.filters).toContain('eq:"student_id","student-1"');
  });

  it("refuses an application that is no longer editable", async () => {
    const { client, calls } = fakeClient(
      happy((c) => (c.table === "applications" && c.op === "select" ? { data: { ...draft, status: "pending_approval" } } : undefined)),
    );
    expect(await editAndResubmit(client as never, "student-1", "APP-2026-0499", prefs)).toMatchObject({ kind: "blocked", code: "NOT_EDITABLE" });
    expect(writes(calls)).toEqual([]);
  });
});

describe("withdraw", () => {
  const open = { id: "app-1", reference: "APP-2026-0412", status: "pending_approval", budget_zmw: 2000 };
  const transitions = [{ machine: "application", from_state: "pending_approval", to_state: "withdrawn" }];

  it("calls withdraw_application with the reason", async () => {
    const { client, calls } = fakeClient((c) => {
      if (c.table === "applications") return { data: open };
      if (c.table === "state_transitions") return { data: transitions };
      return { data: null };
    });
    expect(await withdraw(client as never, "student-1", "APP-2026-0412", "Found a place")).toEqual({ ok: true });
    expect(calls.find((c) => c.rpc)!.payload).toEqual({ p_app: "app-1", p_reason: "Found a place" });
  });

  it("does not call the database function when the move is not allowed", async () => {
    const { client, calls } = fakeClient((c) => {
      if (c.table === "applications") return { data: { ...open, status: "declined" } };
      if (c.table === "state_transitions") return { data: transitions };
      return { data: null };
    });
    expect(await withdraw(client as never, "student-1", "APP-2026-0412", null)).toEqual({ ok: false, code: "WITHDRAW_NOT_ALLOWED" });
    expect(calls.some((c) => c.rpc)).toBe(false);
  });

  it("maps INVALID_TRANSITION from the database", async () => {
    const { client } = fakeClient((c) => {
      if (c.table === "applications") return { data: open };
      if (c.table === "state_transitions") return { data: transitions };
      if (c.rpc) return { error: { code: "P0001", message: "INVALID_TRANSITION: application pending_approval -> withdrawn" } };
      return { data: null };
    });
    expect(await withdraw(client as never, "student-1", "APP-2026-0412", null)).toMatchObject({ ok: false, code: "WITHDRAW_NOT_ALLOWED" });
  });
});
