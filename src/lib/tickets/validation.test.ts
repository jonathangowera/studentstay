import { describe, expect, it } from "vitest";
import { canReopen, defaultLocation, parseRepair, reopenUntil } from "./validation";

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const BOOKING = "55555555-5555-4555-8555-555555555555";
const good = { booking_id: BOOKING, category: "Plumbing", title: "Leaking tap", description: "Drips all night", priority: "medium", location: "Room 12, bathroom" };
const ROWS = [{ machine: "ticket", from_state: "completed", to_state: "reopened" }];

describe("parseRepair", () => {
  it("accepts a complete report", () => {
    expect(parseRepair(form(good))).toEqual({
      ok: true,
      data: { bookingId: BOOKING, category: "Plumbing", title: "Leaking tap", description: "Drips all night", priority: "medium", location: "Room 12, bathroom" },
    });
  });
  it("makes the description optional", () => {
    const out = parseRepair(form({ ...good, description: "  " }));
    expect(out.ok && out.data.description).toBeNull();
  });
  it("names each problem field", () => {
    const out = parseRepair(form({ booking_id: "x", category: "Roof", title: "ab", priority: "urgent", location: "" }));
    expect(out).toEqual({
      ok: false,
      errors: {
        booking_id: "Choose the place the repair is for.",
        category: "Choose a category.",
        title: "Give a short title, at least 3 characters.",
        priority: "Choose how urgent it is.",
        location: "Say where the problem is, for example the room and bathroom.",
      },
    });
  });
  it("only allows the five categories", () => {
    for (const c of ["Plumbing", "Electrical", "Security", "Internet", "Other"]) expect(parseRepair(form({ ...good, category: c })).ok).toBe(true);
    expect(parseRepair(form({ ...good, category: "plumbing" })).ok).toBe(false);
  });
  it("limits lengths", () => {
    expect(parseRepair(form({ ...good, title: "x".repeat(121) })).ok).toBe(false);
    expect(parseRepair(form({ ...good, description: "x".repeat(1001) })).ok).toBe(false);
    expect(parseRepair(form({ ...good, location: "x".repeat(201) })).ok).toBe(false);
  });
});

describe("defaultLocation", () => {
  it("names the place, room and bed", () => {
    expect(defaultLocation("Demo Park", "12", "A")).toBe("Demo Park, Room 12, bed A");
  });
});

describe("canReopen", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("allows a completed request within 7 days", () => {
    expect(canReopen({ status: "completed", completed_at: "2026-11-13T12:00:00Z" }, ROWS, now)).toBe(true);
  });
  it("refuses after 7 days, before completion, or when the table has no such move", () => {
    expect(canReopen({ status: "completed", completed_at: "2026-11-13T11:59:00Z" }, ROWS, now)).toBe(false);
    expect(canReopen({ status: "in_progress", completed_at: null }, ROWS, now)).toBe(false);
    expect(canReopen({ status: "completed", completed_at: null }, ROWS, now)).toBe(false);
    expect(canReopen({ status: "completed", completed_at: "2026-11-19T12:00:00Z" }, [], now)).toBe(false);
  });
  it("gives the last day to reopen", () => {
    expect(reopenUntil("2026-11-13T12:00:00.000Z")).toBe("2026-11-20T12:00:00.000Z");
  });
});
