import { describe, expect, it } from "vitest";
import { TICKET_MOVE, allowedMoves, isTicketReference, parseTicketMove, technicianMoves, type TransitionRow } from "./transitions";

/** The ticket rows from the initial migration, plus one bed row to prove machines are kept apart. */
const ROWS: TransitionRow[] = [
  ["pending", "assigned"],
  ["pending", "cancelled"],
  ["assigned", "in_progress"],
  ["assigned", "escalated"],
  ["assigned", "pending"],
  ["assigned", "cancelled"],
  ["in_progress", "completed"],
  ["in_progress", "escalated"],
  ["completed", "reopened"],
  ["reopened", "assigned"],
  ["reopened", "in_progress"],
  ["reopened", "escalated"],
  ["escalated", "assigned"],
  ["escalated", "in_progress"],
  ["escalated", "completed"],
].map(([from_state, to_state]) => ({ machine: "ticket", from_state, to_state }));
ROWS.push({ machine: "bed", from_state: "assigned", to_state: "occupied" });

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const ID = "11111111-1111-4111-8111-111111111111";

describe("allowedMoves", () => {
  it("reads one machine and one state from the table", () => {
    expect(allowedMoves(ROWS, "ticket", "assigned")).toEqual(["in_progress", "escalated", "pending", "cancelled"]);
    expect(allowedMoves(ROWS, "bed", "assigned")).toEqual(["occupied"]);
    expect(allowedMoves(ROWS, "ticket", "cancelled")).toEqual([]);
  });
  it("drops duplicate rows", () => {
    expect(allowedMoves([...ROWS, ROWS[0]], "ticket", "pending")).toEqual(["assigned", "cancelled"]);
  });
});

describe("technicianMoves", () => {
  it("offers Start work from assigned or reopened", () => {
    expect(technicianMoves(ROWS, "assigned", true)).toEqual(["in_progress", "escalated"]);
    expect(technicianMoves(ROWS, "reopened", true)).toEqual(["in_progress", "escalated"]);
  });
  it("offers Mark completed and Escalate while in progress", () => {
    expect(technicianMoves(ROWS, "in_progress", true)).toEqual(["completed", "escalated"]);
  });
  it("never offers owner moves (cancel, back to pending) or anything on a closed ticket", () => {
    expect(technicianMoves(ROWS, "pending", true)).toEqual([]);
    expect(technicianMoves(ROWS, "completed", true)).toEqual([]);
    expect(technicianMoves(ROWS, "cancelled", true)).toEqual([]);
  });
  it("offers nothing on a ticket assigned to someone else", () => {
    expect(technicianMoves(ROWS, "assigned", false)).toEqual([]);
  });
  it("follows the table, not a hard-coded list", () => {
    expect(technicianMoves([{ machine: "ticket", from_state: "assigned", to_state: "completed" }], "assigned", true)).toEqual(["completed"]);
  });
  it("has a label and a note rule for every move", () => {
    expect(TICKET_MOVE.in_progress.label).toBe("Start work");
    expect(TICKET_MOVE.completed.note).toBe("required");
    expect(TICKET_MOVE.escalated.note).toBe("required");
  });
});

describe("parseTicketMove", () => {
  const base = { ticket_id: ID, reference: "TKT-1101" };
  it("accepts Start work without a note", () => {
    expect(parseTicketMove(form({ ...base, to: "in_progress" }))).toEqual({
      ok: true,
      data: { ticketId: ID, reference: "TKT-1101", to: "in_progress", note: null },
    });
  });
  it("needs a note to complete or escalate", () => {
    expect(parseTicketMove(form({ ...base, to: "completed", note: "  " }))).toEqual({ ok: false, errors: { note: "Say briefly what was done." } });
    expect(parseTicketMove(form({ ...base, to: "escalated" }))).toEqual({ ok: false, errors: { note: "Give a reason for escalating." } });
    expect(parseTicketMove(form({ ...base, to: "completed", note: "Replaced the tap washer" })).ok).toBe(true);
  });
  it("refuses moves a technician cannot make, and bad ids", () => {
    expect(parseTicketMove(form({ ...base, to: "cancelled" })).ok).toBe(false);
    expect(parseTicketMove(form({ ...base, to: "reopened" })).ok).toBe(false);
    expect(parseTicketMove(form({ ...base, ticket_id: "x", to: "in_progress" })).ok).toBe(false);
    expect(parseTicketMove(form({ ...base, reference: "APP-2026-0001", to: "in_progress" })).ok).toBe(false);
  });
  it("limits the note to 500 characters", () => {
    expect(parseTicketMove(form({ ...base, to: "escalated", note: "x".repeat(501) })).ok).toBe(false);
  });
  it("recognises ticket references", () => {
    expect(isTicketReference("TKT-1101")).toBe(true);
    expect(isTicketReference("TKT-")).toBe(false);
    expect(isTicketReference("tkt-1")).toBe(false);
  });
});
