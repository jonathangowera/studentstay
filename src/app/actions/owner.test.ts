import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { decidePrivateApplicationAction } from "./owner";

const APP = "11111111-1111-4111-8111-111111111111";
const BED = "22222222-2222-4222-8222-222222222222";
const ROW = {
  id: APP,
  reference: "APP-2026-0420",
  status: "submitted",
  submitted_at: "2026-11-12T08:00:00Z",
  listing_id: "33333333-3333-4333-8333-333333333333",
  requested_room_type: "double",
  budget_zmw: 1500,
  intake: "Semester I 2027",
  applicant_name: "Applicant",
  applicant_institution: "University of Zambia",
  document_count: 1,
};

function signIn(role: Role | null, reply: (c: Call) => Reply | undefined = () => undefined) {
  const fake = fakeSupabase(role, (c) => reply(c) ?? (c.table === "private_application_inbox" ? { data: ROW } : undefined));
  current.client = fake.client;
  return fake;
}

const accept = () => formOf({ reference: "APP-2026-0420", application_id: APP, decision: "accepted", bed_id: BED });
const idle = { status: "idle" as const };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("decidePrivateApplicationAction", () => {
  it.each<Role>(["student", "university_admin", "technician", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    const fake = signIn(role);
    const err = await decidePrivateApplicationAction(idle, accept()).catch((e) => e);
    expect(redirectTarget(err)).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("sends a signed-out visitor to sign in", async () => {
    const fake = signIn(null);
    const err = await decidePrivateApplicationAction(idle, accept()).catch((e) => e);
    expect(redirectTarget(err)).toMatch(/^\/sign-in\?next=/);
    expect(fake.dataCalls()).toEqual([]);
  });

  it("accepts with the owner's own session and tells them about the 48-hour hold", async () => {
    const fake = signIn("owner");
    const out = await decidePrivateApplicationAction(idle, accept());
    expect(out).toEqual({
      status: "success",
      message: "Accepted. A bed is held for 48 hours. The student must now pay the demonstration deposit to confirm it.",
    });
    const rpc = fake.calls.find((c) => c.rpc);
    expect(rpc).toEqual({ rpc: "decide_private_application", op: "rpc", payload: { p_app: APP, p_decision: "accepted", p_bed: BED }, filters: [] });
  });

  it("declines with the reason and no bed", async () => {
    const fake = signIn("owner");
    const out = await decidePrivateApplicationAction(idle, formOf({ reference: "APP-2026-0420", application_id: APP, decision: "declined", note: "Full" }));
    expect(out.status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)?.payload).toEqual({ p_app: APP, p_decision: "declined", p_note: "Full" });
  });

  it("stops a decline without a reason before calling the database", async () => {
    const fake = signIn("owner");
    const out = await decidePrivateApplicationAction(idle, formOf({ reference: "APP-2026-0420", application_id: APP, decision: "declined" }));
    expect(out.fieldErrors?.note).toBe("Give a reason. The student sees it.");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("does not call the function for an application that is not in the owner's inbox", async () => {
    const fake = signIn("owner", (c) => (c.table === "private_application_inbox" ? { data: null } : undefined));
    const out = await decidePrivateApplicationAction(idle, accept());
    expect(out.code).toBe("APPLICATION_NOT_FOUND");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("does not call the function once the application is decided", async () => {
    const fake = signIn("owner", (c) => (c.table === "private_application_inbox" ? { data: { ...ROW, status: "accepted" } } : undefined));
    const out = await decidePrivateApplicationAction(idle, accept());
    expect(out.code).toBe("ALREADY_DECIDED");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it.each([
    ["BED_UNAVAILABLE: that bed is not free", "BED_UNAVAILABLE", /no longer free/],
    ["BED_REQUIRED: choose the bed to hold", "BED_REQUIRED", /Choose the bed/],
    ["ALREADY_DECIDED", "ALREADY_DECIDED", /already been decided/],
    ["NOTE_REQUIRED: give a reason", "NOTE_REQUIRED", /reason/],
    ["NOT_ALLOWED", "NOT_ALLOWED", /your own properties/],
  ])("maps %s to a friendly message with a reference", async (message, code, text) => {
    signIn("owner", (c) => (c.rpc ? { error: { message, code: "P0001" } } : undefined));
    const out = await decidePrivateApplicationAction(idle, accept());
    expect(out.status).toBe("error");
    expect(out.code).toBe(code);
    expect(out.message).toMatch(text);
    expect(out.message).not.toContain(message);
    expect(out.errorRef).toMatch(/^REF-/);
  });
});
