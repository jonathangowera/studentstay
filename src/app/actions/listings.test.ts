import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ID, fakeSupabase, formOf, redirectTarget, type Call, type Reply } from "@/test/fake-supabase";
import type { Role } from "@/lib/auth/roles";
import { listingMessage } from "@/lib/listings/messages";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const current: { client: unknown } = { client: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current.client }));

import { changeBedStateAction, changeRoomPriceAction, confirmAvailabilityAction } from "./listings";

const LISTING = "77777777-7777-4777-8777-777777777777";
const BED = "66666666-6666-4666-8666-666666666666";
const ROOM = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const BED_ROWS = [
  ["available", "blocked_for_maintenance"],
  ["available", "held"],
  ["blocked_for_maintenance", "available"],
  ["reserved", "occupied"],
  ["reserved", "blocked_for_maintenance"],
  ["occupied", "available"],
  ["held", "available"],
].map(([from_state, to_state]) => ({ machine: "bed", from_state, to_state }));

function signIn(role: Role | null, opts: { bedState?: string; listing?: string; over?: (c: Call) => Reply | undefined } = {}) {
  const fake = fakeSupabase(role, (c) => {
    const o = opts.over?.(c);
    if (o) return o;
    if (c.table === "partners") return { data: [{ id: PARTNER, business_name: "Demo Lodges" }] };
    if (c.table === "listings") return { data: [{ id: LISTING }] };
    if (c.table === "beds" && c.op === "select") return { data: { id: BED, state: opts.bedState ?? "available", rooms: { listing_id: opts.listing ?? LISTING } } };
    if (c.table === "beds" && c.op === "update") return { data: [{ id: BED }] };
    if (c.table === "rooms" && c.op === "select") return { data: { id: ROOM, listing_id: opts.listing ?? LISTING } };
    if (c.table === "state_transitions") return { data: BED_ROWS };
    return undefined;
  });
  current.client = fake.client;
  return fake;
}

const idle = { status: "idle" as const };
const change = (to: string, note = "") => formOf({ listing_id: LISTING, bed_id: BED, to, note });
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("owner listing actions refuse other roles", () => {
  it.each<Role>(["student", "university_admin", "technician", "system_admin"])("refuses a %s before any data is touched", async (role) => {
    for (const run of [
      () => confirmAvailabilityAction(idle, formOf({ listing_id: LISTING })),
      () => changeBedStateAction(idle, change("blocked_for_maintenance")),
      () => changeRoomPriceAction(idle, formOf({ listing_id: LISTING, room_id: ROOM, price: "1350" })),
    ]) {
      const fake = signIn(role);
      expect(redirectTarget(await run().catch((e) => e))).toBe("/no-access");
      expect(fake.dataCalls()).toEqual([]);
    }
  });
});

describe("changeBedStateAction", () => {
  it("blocks a free bed with a note, guarded on its current state", async () => {
    const fake = signIn("owner");
    expect(await changeBedStateAction(idle, change("blocked_for_maintenance", "Broken frame"))).toEqual({ status: "success", message: "Bed state saved." });
    const update = fake.calls.find((c) => c.table === "beds" && c.op === "update");
    expect(update?.payload).toEqual({ state: "blocked_for_maintenance", state_note: "Broken frame" });
    expect(update?.filters).toEqual([`eq:"id","${BED}"`, `eq:"state","available"`]);
  });

  it("marks a reserved bed occupied", async () => {
    const fake = signIn("owner", { bedState: "reserved" });
    expect((await changeBedStateAction(idle, change("occupied"))).status).toBe("success");
    expect(fake.calls.find((c) => c.op === "update")?.payload).toEqual({ state: "occupied", state_note: null });
  });

  it("refuses reserved to blocked, which is not one of the agreed moves", async () => {
    const fake = signIn("owner", { bedState: "reserved" });
    const out = await changeBedStateAction(idle, change("blocked_for_maintenance"));
    expect(out.code).toBe("INVALID_TRANSITION");
    expect(fake.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("refuses any change on a held bed", async () => {
    const fake = signIn("owner", { bedState: "held" });
    expect((await changeBedStateAction(idle, change("available"))).code).toBe("INVALID_TRANSITION");
    expect(fake.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("refuses held, pending approval and reserved as targets before reading anything", async () => {
    for (const to of ["held", "pending_approval", "reserved"]) {
      const fake = signIn("owner");
      expect((await changeBedStateAction(idle, change(to))).status).toBe("error");
      expect(fake.dataCalls()).toEqual([]);
    }
  });

  it("refuses a bed of another owner's listing", async () => {
    const fake = signIn("owner", { listing: "99999999-0000-4000-8000-000000000000" });
    expect((await changeBedStateAction(idle, change("blocked_for_maintenance"))).code).toBe("NOT_ALLOWED");
    expect(fake.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("says when the bed changed in the meantime", async () => {
    signIn("owner", { over: (c) => (c.table === "beds" && c.op === "update" ? { data: [] } : undefined) });
    expect((await changeBedStateAction(idle, change("blocked_for_maintenance"))).code).toBe("STATE_CHANGED");
  });

  it("maps INVALID_TRANSITION from the database to a friendly message", async () => {
    signIn("owner", {
      over: (c) => (c.table === "beds" && c.op === "update" ? { error: { message: "INVALID_TRANSITION: a bed cannot change from available to occupied", code: "P0001" } } : undefined),
    });
    const out = await changeBedStateAction(idle, change("blocked_for_maintenance"));
    expect(out.message).toBe(listingMessage("INVALID_TRANSITION"));
    expect(out.message).not.toMatch(/cannot change from/);
    expect(out.errorRef).toMatch(/^REF-/);
  });
});

describe("changeRoomPriceAction and confirmAvailabilityAction", () => {
  it("updates only price_zmw on the owner's room", async () => {
    const fake = signIn("owner");
    expect((await changeRoomPriceAction(idle, formOf({ listing_id: LISTING, room_id: ROOM, price: "K1,450" }))).status).toBe("success");
    const update = fake.calls.find((c) => c.table === "rooms" && c.op === "update");
    expect(update?.payload).toEqual({ price_zmw: 1450 });
    expect(update?.filters).toEqual([`eq:"id","${ROOM}"`]);
  });

  it("refuses a bad price before reading anything", async () => {
    const fake = signIn("owner");
    const out = await changeRoomPriceAction(idle, formOf({ listing_id: LISTING, room_id: ROOM, price: "lots" }));
    expect(out.fieldErrors?.price).toBeTruthy();
    expect(fake.dataCalls()).toEqual([]);
  });

  it("confirms availability on the owner's own listing", async () => {
    const fake = signIn("owner");
    expect((await confirmAvailabilityAction(idle, formOf({ listing_id: LISTING }))).status).toBe("success");
    expect(fake.calls.find((c) => c.rpc)).toEqual({ rpc: "confirm_listing_availability", op: "rpc", payload: { p_listing: LISTING }, filters: [] });
  });

  it("refuses to confirm another owner's listing", async () => {
    const fake = signIn("owner", { over: (c) => (c.table === "listings" ? { data: [] } : undefined) });
    expect((await confirmAvailabilityAction(idle, formOf({ listing_id: LISTING }))).code).toBe("NOT_ALLOWED");
    expect(fake.calls.some((c) => c.rpc)).toBe(false);
  });
});

it("uses the signed-in owner's id for the business lookup", async () => {
  const fake = signIn("owner");
  await confirmAvailabilityAction(idle, formOf({ listing_id: LISTING }));
  expect(fake.calls.find((c) => c.table === "partners")?.filters).toContain(`eq:"owner_id","${USER_ID}"`);
});
