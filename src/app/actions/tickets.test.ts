import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ID, fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { setTicketStatusAction } from "./tickets";

const TICKET = "44444444-4444-4444-8444-444444444444";
const ROW = { id: TICKET, reference: "TKT-1101", status: "assigned", assigned_to: USER_ID };
const TRANSITIONS = [
  { machine: "ticket", from_state: "assigned", to_state: "in_progress" },
  { machine: "ticket", from_state: "assigned", to_state: "escalated" },
  { machine: "ticket", from_state: "in_progress", to_state: "completed" },
  { machine: "ticket", from_state: "in_progress", to_state: "escalated" },
];

function signIn(role: Role | null, ticket: Record<string, unknown> | null = ROW, rpc?: Reply) {
  const fake = fakeSupabase(role, (c: Call) => {
    if (c.table === "maintenance_tickets") return { data: ticket };
    if (c.table === "state_transitions") return { data: TRANSITIONS };
    if (c.rpc) return rpc;
    return undefined;
  });
  current.client = fake.client;
  return fake;
}

const start = () => formOf({ ticket_id: TICKET, reference: "TKT-1101", to: "in_progress" });
const idle = { status: "idle" as const };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("setTicketStatusAction", () => {
  it.each<Role>(["student", "owner", "university_admin", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    const fake = signIn(role);
    const err = await setTicketStatusAction(idle, start()).catch((e) => e);
    expect(redirectTarget(err)).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("starts work on the technician's own assigned ticket", async () => {
    const fake = signIn("technician");
    const out = await setTicketStatusAction(idle, start());
    expect(out).toEqual({ status: "success", message: "Marked as in progress. The tenant was told." });
    expect(fake.calls.find((c) => c.rpc)?.payload).toEqual({ p_ticket: TICKET, p_new: "in_progress" });
  });

  it("needs a note to complete", async () => {
    const fake = signIn("technician", { ...ROW, status: "in_progress" });
    const out = await setTicketStatusAction(idle, formOf({ ticket_id: TICKET, reference: "TKT-1101", to: "completed" }));
    expect(out.fieldErrors?.note).toBe("Say briefly what was done.");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("refuses a move the table does not allow from the current status", async () => {
    const fake = signIn("technician", { ...ROW, status: "assigned" });
    const out = await setTicketStatusAction(idle, formOf({ ticket_id: TICKET, reference: "TKT-1101", to: "completed", note: "Done" }));
    expect(out.code).toBe("INVALID_TRANSITION");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("refuses a ticket assigned to someone else", async () => {
    const fake = signIn("technician", { ...ROW, assigned_to: "someone-else" });
    const out = await setTicketStatusAction(idle, start());
    expect(out.code).toBe("NOT_ALLOWED");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("says when the ticket cannot be found", async () => {
    signIn("technician", null);
    expect((await setTicketStatusAction(idle, start())).code).toBe("TICKET_NOT_FOUND");
  });

  it("maps a database refusal to a friendly message with a reference", async () => {
    signIn("technician", ROW, { error: { message: "INVALID_TRANSITION: a ticket cannot change from assigned to in_progress", code: "P0001" } });
    const out = await setTicketStatusAction(idle, start());
    expect(out.code).toBe("INVALID_TRANSITION");
    expect(out.message).toMatch(/Refresh the page/);
    expect(out.errorRef).toMatch(/^REF-/);
  });
});
