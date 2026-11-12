import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ID, fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { reopenRepairAction, reportRepairAction } from "./repairs";

const BOOKING = "55555555-5555-4555-8555-555555555555";
const BED = "66666666-6666-4666-8666-666666666666";
const LISTING = "77777777-7777-4777-8777-777777777777";
const TICKET = "44444444-4444-4444-8444-444444444444";
const report = (o: Record<string, string> = {}) =>
  formOf({ booking_id: BOOKING, category: "Plumbing", title: "Leaking tap", priority: "high", location: "Demo Park, Room 12, bed A", ...o });

function signIn(role: Role | null, over: (c: Call) => Reply | undefined = () => undefined) {
  const fake = fakeSupabase(role, (c) => {
    const o = over(c);
    if (o) return o;
    if (c.table === "bookings") return { data: [{ id: BOOKING, state: "occupied", bed_id: BED, start_date: "2026-11-01" }] };
    if (c.table === "beds") return { data: [{ id: BED, label: "A", rooms: { room_number: "12", listing_id: LISTING, listings: { id: LISTING, name: "Demo Park" } } }] };
    if (c.table === "maintenance_tickets" && c.op === "insert") return { data: { reference: "TKT-2001" } };
    if (c.table === "state_transitions") return { data: [{ machine: "ticket", from_state: "completed", to_state: "reopened" }] };
    return undefined;
  });
  current.client = fake.client;
  return fake;
}

const idle = { status: "idle" as const };
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("reportRepairAction", () => {
  it.each<Role>(["owner", "university_admin", "technician", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    const fake = signIn(role);
    expect(redirectTarget(await reportRepairAction(idle, report()).catch((e) => e))).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("inserts only the browser-writable columns, with the place taken from the student's own booking", async () => {
    const fake = signIn("student");
    const out = await reportRepairAction(idle, report({ listing_id: "forged", bed_id: "forged" }));
    expect(out.status).toBe("success");
    expect(out.reference).toBe("TKT-2001");
    const insert = fake.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toEqual({
      listing_id: LISTING,
      bed_id: BED,
      booking_id: BOOKING,
      reporter_id: USER_ID,
      location_text: "Demo Park, Room 12, bed A",
      category: "Plumbing",
      title: "Leaking tap",
      description: null,
      priority: "high",
    });
    expect(Object.keys(insert?.payload as object)).not.toContain("status");
  });

  it("refuses a booking that is not the student's live booking", async () => {
    const fake = signIn("student", (c) => (c.table === "bookings" ? { data: [] } : undefined));
    const out = await reportRepairAction(idle, report());
    expect(out.code).toBe("NO_LIVE_BOOKING");
    expect(fake.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("returns field errors before touching data", async () => {
    const fake = signIn("student");
    const out = await reportRepairAction(idle, report({ category: "Roof", title: "" }));
    expect(out.fieldErrors?.category).toBeTruthy();
    expect(out.fieldErrors?.title).toBeTruthy();
    expect(fake.dataCalls()).toEqual([]);
  });

  it("explains a refusal from row-level security", async () => {
    signIn("student", (c) => (c.op === "insert" ? { error: { message: "new row violates row-level security policy", code: "42501" } } : undefined));
    const out = await reportRepairAction(idle, report());
    expect(out.message).toMatch(/live booking/);
    expect(out.errorRef).toMatch(/^REF-/);
  });
});

describe("reopenRepairAction", () => {
  const recent = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const old = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  const ticket = (o: Record<string, unknown> = {}) => ({ id: TICKET, reference: "TKT-1101", status: "completed", completed_at: recent, reporter_id: USER_ID, ...o });
  const tickets = (t: unknown) => (c: Call) => (c.table === "maintenance_tickets" ? { data: t } : undefined);

  it.each<Role>(["owner", "university_admin", "technician", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    const fake = signIn(role);
    expect(redirectTarget(await reopenRepairAction(idle, formOf({ reference: "TKT-1101" })).catch((e) => e))).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("reopens within 7 days with the student's own session", async () => {
    const fake = signIn("student", tickets(ticket()));
    const out = await reopenRepairAction(idle, formOf({ reference: "TKT-1101", note: "Still dripping" }));
    expect(out.status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)?.payload).toEqual({ p_ticket: TICKET, p_new: "reopened", p_note: "Still dripping" });
  });

  it("refuses after 7 days without calling the database", async () => {
    const fake = signIn("student", tickets(ticket({ completed_at: old })));
    const out = await reopenRepairAction(idle, formOf({ reference: "TKT-1101" }));
    expect(out.code).toBe("REOPEN_WINDOW_PASSED");
    expect(out.message).toBe("This request can no longer be reopened. Please report a new one.");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("refuses someone else's request", async () => {
    const fake = signIn("student", tickets(ticket({ reporter_id: "someone-else" })));
    expect((await reopenRepairAction(idle, formOf({ reference: "TKT-1101" }))).code).toBe("TICKET_NOT_FOUND");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("maps REOPEN_WINDOW_PASSED from the database", async () => {
    signIn("student", (c) =>
      c.rpc ? { error: { message: "REOPEN_WINDOW_PASSED: a ticket can be reopened for 7 days", code: "P0001" } } : tickets(ticket())(c),
    );
    const out = await reopenRepairAction(idle, formOf({ reference: "TKT-1101" }));
    expect(out.code).toBe("REOPEN_WINDOW_PASSED");
    expect(out.errorRef).toMatch(/^REF-/);
  });
});
