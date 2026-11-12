import { describe, expect, it } from "vitest";
import { addBedCounts, bookedBeds, countBeds, emptyBedCounts, totalBeds } from "./beds";
import { MODERATION_STATES, moderationBadge } from "./labels";
import { manageMessage, ticketMessage } from "@/lib/tickets/messages";
import { OWNER_BED_MOVES, ownerBedMoves, parseBedChange, parsePrice } from "./beds";

describe("bed counts", () => {
  it("counts each state and keeps zero for the rest", () => {
    const c = countBeds(["available", "available", "held", "occupied", "reserved", "blocked_for_maintenance", "nonsense"]);
    expect(c).toEqual({ available: 2, held: 1, pending_approval: 0, reserved: 1, occupied: 1, blocked_for_maintenance: 1 });
    expect(totalBeds(c)).toBe(6);
    expect(bookedBeds(c)).toBe(2);
  });
  it("adds counts of several properties", () => {
    const sum = addBedCounts(countBeds(["available"]), countBeds(["available", "occupied"]));
    expect(sum.available).toBe(2);
    expect(sum.occupied).toBe(1);
    expect(totalBeds(emptyBedCounts())).toBe(0);
  });
});

describe("moderationBadge", () => {
  it("has an icon and text for every state", () => {
    for (const m of MODERATION_STATES) {
      const b = moderationBadge(m);
      expect(b.icon).toBeTruthy();
      expect(b.label).not.toBe("Unknown");
    }
    expect(moderationBadge("awaiting_moderation").label).toBe("Awaiting moderation");
    expect(moderationBadge("whatever").label).toBe("Unknown");
  });
});

describe("ticketMessage", () => {
  it("maps the ticket codes to friendly text", () => {
    expect(ticketMessage("INVALID_TRANSITION")).toMatch(/not possible from the current status/);
    expect(ticketMessage("NOT_ALLOWED")).toBe("You can only update repair requests assigned to you.");
    expect(ticketMessage("TICKET_NOT_FOUND")).toBe("We could not find that repair request.");
    expect(ticketMessage("REOPEN_WINDOW_PASSED")).toBe("This request can no longer be reopened. Please report a new one.");
    expect(ticketMessage("UNKNOWN")).toBe("Something went wrong. Please try again.");
  });
  it("words Assign and Escalate refusals for owners and administrators", () => {
    expect(manageMessage("NOT_ALLOWED")).toBe("You can only manage repair requests on properties you look after.");
    expect(manageMessage("NOT_A_TECHNICIAN")).toBe("Choose a technician from the list.");
    expect(manageMessage("INVALID_TRANSITION")).toMatch(/not possible from the current status/);
  });
});


const BED_ROWS = [
  ["available", "blocked_for_maintenance"],
  ["available", "held"],
  ["available", "pending_approval"],
  ["blocked_for_maintenance", "available"],
  ["held", "available"],
  ["held", "blocked_for_maintenance"],
  ["held", "reserved"],
  ["occupied", "available"],
  ["pending_approval", "available"],
  ["pending_approval", "reserved"],
  ["reserved", "available"],
  ["reserved", "blocked_for_maintenance"],
  ["reserved", "occupied"],
].map(([from_state, to_state]) => ({ machine: "bed", from_state, to_state }));

describe("ownerBedMoves", () => {
  it("offers only the four agreed moves", () => {
    expect(ownerBedMoves(BED_ROWS, "available").map((m) => m.to)).toEqual(["blocked_for_maintenance"]);
    expect(ownerBedMoves(BED_ROWS, "blocked_for_maintenance").map((m) => m.to)).toEqual(["available"]);
    expect(ownerBedMoves(BED_ROWS, "reserved").map((m) => m.to)).toEqual(["occupied"]);
    expect(ownerBedMoves(BED_ROWS, "occupied").map((m) => m.to)).toEqual(["available"]);
  });
  it("never offers a change on held or pending approval beds", () => {
    expect(ownerBedMoves(BED_ROWS, "held")).toEqual([]);
    expect(ownerBedMoves(BED_ROWS, "pending_approval")).toEqual([]);
  });
  it("never offers held, pending approval or reserved as a new state", () => {
    for (const m of OWNER_BED_MOVES) expect(["held", "pending_approval", "reserved"]).not.toContain(m.to);
  });
  it("drops an agreed move the table no longer allows", () => {
    expect(ownerBedMoves(BED_ROWS.filter((r) => r.to_state !== "occupied"), "reserved")).toEqual([]);
  });
});

describe("parseBedChange and parsePrice", () => {
  const L = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  const f = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  it("accepts an allowed target and an optional note", () => {
    expect(parseBedChange(f({ listing_id: L, bed_id: B, to: "blocked_for_maintenance", note: "Broken frame" }))).toEqual({
      ok: true,
      data: { listingId: L, bedId: B, to: "blocked_for_maintenance", note: "Broken frame" },
    });
  });
  it("refuses held, pending approval and reserved as targets", () => {
    for (const to of ["held", "pending_approval", "reserved"]) expect(parseBedChange(f({ listing_id: L, bed_id: B, to })).ok).toBe(false);
  });
  it("reads kwacha amounts", () => {
    expect(parsePrice(f({ listing_id: L, room_id: B, price: "K1,350" }))).toEqual({ ok: true, data: { listingId: L, roomId: B, price: 1350 } });
    expect(parsePrice(f({ listing_id: L, room_id: B, price: "1350.50" })).ok).toBe(true);
    expect(parsePrice(f({ listing_id: L, room_id: B, price: "-5" })).ok).toBe(false);
    expect(parsePrice(f({ listing_id: L, room_id: B, price: "abc" })).ok).toBe(false);
    expect(parsePrice(f({ listing_id: L, room_id: B, price: "100001" })).ok).toBe(false);
  });
});
