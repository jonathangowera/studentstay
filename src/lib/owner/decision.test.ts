import { describe, expect, it } from "vitest";
import { HOLD_MESSAGE, canDecide, orderFreeBeds, parseOwnerDecision, type FreeBed } from "./decision";
import { ownerDecisionMessage } from "./messages";

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const APP = "11111111-1111-4111-8111-111111111111";
const BED = "22222222-2222-4222-8222-222222222222";
const base = { reference: "APP-2026-0420", application_id: APP };

describe("canDecide", () => {
  it("allows only submitted and under review", () => {
    expect(canDecide("submitted")).toBe(true);
    expect(canDecide("under_review")).toBe(true);
    for (const s of ["accepted", "declined", "withdrawn", "expired", "draft"] as const) expect(canDecide(s)).toBe(false);
  });
});

describe("parseOwnerDecision", () => {
  it("accepts with a bed and an optional message", () => {
    expect(parseOwnerDecision(form({ ...base, decision: "accepted", bed_id: BED }))).toEqual({
      ok: true,
      data: { reference: "APP-2026-0420", applicationId: APP, decision: "accepted", bedId: BED, note: null },
    });
  });
  it("needs a bed to accept", () => {
    expect(parseOwnerDecision(form({ ...base, decision: "accepted" }))).toEqual({ ok: false, errors: { bed_id: "Choose the bed to hold." } });
  });
  it("needs a reason to decline and never sends a bed", () => {
    expect(parseOwnerDecision(form({ ...base, decision: "declined", note: " " }))).toEqual({
      ok: false,
      errors: { note: "Give a reason. The student sees it." },
    });
    const ok = parseOwnerDecision(form({ ...base, decision: "declined", note: "Full for the term", bed_id: BED }));
    expect(ok).toEqual({ ok: true, data: { reference: "APP-2026-0420", applicationId: APP, decision: "declined", bedId: null, note: "Full for the term" } });
  });
  it("refuses unknown decisions, bad ids and long notes", () => {
    expect(parseOwnerDecision(form({ ...base, decision: "approved", bed_id: BED })).ok).toBe(false);
    expect(parseOwnerDecision(form({ ...base, application_id: "x", decision: "declined", note: "n" })).ok).toBe(false);
    expect(parseOwnerDecision(form({ ...base, reference: "TKT-1", decision: "declined", note: "n" })).ok).toBe(false);
    expect(parseOwnerDecision(form({ ...base, decision: "declined", note: "x".repeat(501) })).ok).toBe(false);
  });
});

describe("orderFreeBeds", () => {
  it("puts the requested room type first, then room number in number order, then bed label", () => {
    const beds: FreeBed[] = [
      { id: "1", label: "A", roomNumber: "10", roomType: "single", price: 1200 },
      { id: "2", label: "B", roomNumber: "9", roomType: "double", price: 900 },
      { id: "3", label: "A", roomNumber: "9", roomType: "double", price: 900 },
      { id: "4", label: "A", roomNumber: "2", roomType: "single", price: 1200 },
    ];
    expect(orderFreeBeds(beds, "double").map((b) => b.id)).toEqual(["3", "2", "4", "1"]);
    expect(orderFreeBeds(beds, null).map((b) => b.id)).toEqual(["4", "3", "2", "1"]);
  });
});

describe("ownerDecisionMessage", () => {
  it("words each database code for the owner", () => {
    expect(ownerDecisionMessage("BED_UNAVAILABLE")).toBe("That bed is no longer free. Nothing was saved. Choose another bed.");
    expect(ownerDecisionMessage("BED_REQUIRED")).toBe("Choose the bed to hold.");
    expect(ownerDecisionMessage("ALREADY_DECIDED")).toMatch(/already been decided/);
    expect(ownerDecisionMessage("NOTE_REQUIRED")).toMatch(/reason/);
    expect(ownerDecisionMessage("NOT_ALLOWED")).toMatch(/your own properties/);
    expect(ownerDecisionMessage("42501")).toMatch(/your own properties/);
    expect(ownerDecisionMessage("SOMETHING_NEW")).toBe("Something went wrong. Please try again.");
  });
  it("tells the owner about the 48-hour hold and the demonstration deposit", () => {
    expect(HOLD_MESSAGE).toBe("A bed is held for 48 hours. The student must now pay the demonstration deposit to confirm it.");
  });
});
