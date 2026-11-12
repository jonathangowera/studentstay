import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { moderateListingAction } from "./moderation";

const LISTING = "77777777-7777-4777-8777-777777777777";
const ROWS = [
  ["awaiting_moderation", "published"],
  ["awaiting_moderation", "suspended"],
  ["published", "suspended"],
  ["requires_review", "awaiting_moderation"],
  ["requires_review", "suspended"],
  ["suspended", "awaiting_moderation"],
].map(([from_state, to_state]) => ({ machine: "listing", from_state, to_state }));

function signIn(role: Role | null, moderation = "awaiting_moderation", rpc?: Reply) {
  const fake = fakeSupabase(role, (c: Call) => {
    if (c.table === "listings") return { data: { id: LISTING, name: "Demo Park", moderation } };
    if (c.table === "state_transitions") return { data: ROWS };
    if (c.rpc) return rpc;
    return undefined;
  });
  current.client = fake.client;
  return fake;
}

const idle = { status: "idle" as const };
const move = (m: string, note = "") => formOf({ listing_id: LISTING, move: m, note });
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("moderateListingAction", () => {
  it.each<Role>(["student", "owner", "university_admin", "technician"])("refuses a %s before any data is touched", async (role) => {
    const fake = signIn(role);
    expect(redirectTarget(await moderateListingAction(idle, move("publish")).catch((e) => e))).toBe("/no-access");
    expect(fake.dataCalls()).toEqual([]);
  });

  it("publishes a listing awaiting moderation through moderate_listing", async () => {
    const fake = signIn("system_admin");
    const out = await moderateListingAction(idle, move("publish"));
    expect(out.status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)).toEqual({ rpc: "moderate_listing", op: "rpc", payload: { p_listing: LISTING, p_state: "published" }, filters: [] });
  });

  it("does not publish a suspended listing", async () => {
    const fake = signIn("system_admin", "suspended");
    expect((await moderateListingAction(idle, move("publish"))).code).toBe("INVALID_TRANSITION");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });

  it("returns a suspended listing to moderation through submit_listing_for_moderation", async () => {
    const fake = signIn("system_admin", "suspended");
    expect((await moderateListingAction(idle, move("return"))).status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)?.rpc).toBe("submit_listing_for_moderation");
  });

  it("suspends with a reason, and refuses without one before reading anything", async () => {
    let fake = signIn("system_admin", "published");
    expect((await moderateListingAction(idle, move("suspend"))).fieldErrors?.note).toBeTruthy();
    expect(fake.dataCalls()).toEqual([]);
    fake = signIn("system_admin", "published");
    expect((await moderateListingAction(idle, move("suspend", "Photos do not match"))).status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)?.payload).toEqual({ p_listing: LISTING, p_state: "suspended", p_note: "Photos do not match" });
  });

  it("maps a database refusal to a friendly message", async () => {
    signIn("system_admin", "awaiting_moderation", { error: { message: "INVALID_TRANSITION: a listing cannot change from x to y", code: "P0001" } });
    const out = await moderateListingAction(idle, move("publish"));
    expect(out.code).toBe("INVALID_TRANSITION");
    expect(out.message).not.toMatch(/cannot change from/);
    expect(out.errorRef).toMatch(/^REF-/);
  });
});
