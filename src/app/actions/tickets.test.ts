import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ID, fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { manageTicketAction, setTicketStatusAction } from "./tickets";

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

describe("manageTicketAction", () => {
  const LISTING = "77777777-7777-4777-8777-777777777777";
  const TECH = "22222222-2222-4222-8222-222222222222";
  const PARTNER = "88888888-8888-4888-8888-888888888888";
  const MORE = [
    { machine: "ticket", from_state: "pending", to_state: "assigned" },
    { machine: "ticket", from_state: "assigned", to_state: "escalated" },
  ];
  function manager(role: Role, ticket: Record<string, unknown> = { id: TICKET, reference: "TKT-1101", status: "pending", listing_id: LISTING }, rpc?: Reply) {
    const fake = fakeSupabase(role, (c: Call) => {
      if (c.table === "maintenance_tickets") return { data: ticket };
      if (c.table === "state_transitions") return { data: MORE };
      if (c.table === "partners") return { data: [{ id: PARTNER }] };
      if (c.table === "listings") return { data: [{ id: LISTING, name: "Demo Park" }] };
      if (c.table === "listing_distances") return { data: [{ listing_id: LISTING, listings: { id: LISTING, name: "Demo Park" } }] };
      if (c.rpc === "list_technicians") return { data: [{ id: TECH, full_name: "Demo Technician" }] };
      if (c.rpc) return rpc;
      return undefined;
    }, { institution_id: "inst-unza" });
    current.client = fake.client;
    return fake;
  }
  const assign = (o: Record<string, string> = {}) => formOf({ ticket_id: TICKET, reference: "TKT-1101", kind: "assign", technician_id: TECH, from: "/owner/tickets", ...o });

  it.each<Role>(["student", "technician", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    const fake = manager(role);
    expect(redirectTarget(await manageTicketAction(idle, assign()).catch((e) => e))).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("lets an owner assign a pending ticket of their property", async () => {
    const fake = manager("owner");
    const out = await manageTicketAction(idle, assign({ note: "Key is with the guard" }));
    expect(out).toEqual({ status: "success", message: "TKT-1101 is assigned to Demo Technician. They were told." });
    expect(fake.calls.find((c) => c.rpc === "assign_ticket")?.payload).toEqual({ p_ticket: TICKET, p_technician: TECH, p_note: "Key is with the guard" });
  });

  it("refuses a ticket outside the owner's properties", async () => {
    const fake = manager("owner", { id: TICKET, reference: "TKT-1101", status: "pending", listing_id: "other-listing" });
    expect((await manageTicketAction(idle, assign())).code).toBe("NOT_ALLOWED");
    expect(fake.calls.some((c) => c.rpc === "assign_ticket")).toBe(false);
  });

  it("refuses someone who is not in the technician list", async () => {
    const fake = manager("owner");
    const out = await manageTicketAction(idle, assign({ technician_id: "33333333-3333-4333-8333-333333333333" }));
    expect(out.code).toBe("NOT_A_TECHNICIAN");
    expect(fake.calls.some((c) => c.rpc === "assign_ticket")).toBe(false);
  });

  it("refuses Assign when the table does not allow it from the status", async () => {
    const fake = manager("owner", { id: TICKET, reference: "TKT-1101", status: "assigned", listing_id: LISTING });
    expect((await manageTicketAction(idle, assign())).code).toBe("INVALID_TRANSITION");
    expect(fake.calls.some((c) => c.rpc === "assign_ticket")).toBe(false);
  });

  it("lets an administrator escalate with a reason, using set_ticket_status", async () => {
    const fake = manager("university_admin", { id: TICKET, reference: "TKT-1101", status: "assigned", listing_id: LISTING });
    const out = await manageTicketAction(idle, formOf({ ticket_id: TICKET, reference: "TKT-1101", kind: "escalate", note: "No progress", from: "/admin/tickets" }));
    expect(out.status).toBe("success");
    expect(fake.calls.find((c) => c.rpc === "set_ticket_status")?.payload).toEqual({ p_ticket: TICKET, p_new: "escalated", p_note: "No progress" });
  });

  it("needs a reason to escalate", async () => {
    const fake = manager("owner");
    const out = await manageTicketAction(idle, formOf({ ticket_id: TICKET, reference: "TKT-1101", kind: "escalate" }));
    expect(out.fieldErrors?.note).toBe("Give a reason for escalating.");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("maps NOT_A_TECHNICIAN from the database", async () => {
    manager("owner", undefined, { error: { message: "NOT_A_TECHNICIAN", code: "P0001" } });
    const out = await manageTicketAction(idle, assign());
    expect(out.message).toBe("Choose a technician from the list.");
    expect(out.errorRef).toMatch(/^REF-/);
  });
});
