import { describe, expect, it } from "vitest";
import { DECISION_PILL, constraintSwitches, groupExcluded, placeLine } from "./labels";

const row = (reason: string | null, n = "1") => ({ exclusionReason: reason, listingName: "Riverside Hall", roomNumber: n, wing: null });

describe("groupExcluded", () => {
  it("groups by reason, with details folded together, biggest group first", () => {
    const groups = groupExcluded([
      row("Gender policy: mixed", "1"),
      row("Above your budget (K900 a month)", "2"),
      row("Gender policy: male only", "3"),
      row("Above your budget (K950 a month)", "4"),
      row("Gender policy: male only", "5"),
      row("No free bed in this room", "6"),
      row(null, "7"),
    ]);
    expect(groups.map((g) => [g.reason, g.rooms.length])).toEqual([
      ["Gender policy", 3],
      ["Above your budget", 2],
      ["No free bed in this room", 1],
      ["Other", 1],
    ]);
    expect(groups[0].rooms.map((r) => r.exclusionReason)).toEqual(["Gender policy: mixed", "Gender policy: male only", "Gender policy: male only"]);
  });

  it("is empty for no rows", () => {
    expect(groupExcluded([])).toEqual([]);
  });
});

describe("constraintSwitches", () => {
  it("lists the five switches in the engine's order, missing ones as on", () => {
    expect(constraintSwitches({ room_type: false }).map((s) => `${s.title}:${s.on}`)).toEqual([
      "Institution recognition:true",
      "Free bed:true",
      "Gender policy:true",
      "Room type:false",
      "Budget ceiling:true",
    ]);
  });
});

describe("labels", () => {
  it("never calls a waiting recommendation approved", () => {
    expect(DECISION_PILL.pending.label).toBe("Waiting for your decision");
    expect(DECISION_PILL.rerun.label).not.toMatch(/approved|allocated/i);
  });

  it("builds a place line", () => {
    expect(placeLine({ listingName: "Riverside Hall", wing: "Block 3", roomNumber: "309", bedLabel: "A" })).toBe("Riverside Hall · Block 3 · Room 309 · Bed A");
    expect(placeLine({ listingName: "Great East Court", wing: null, roomNumber: "112" })).toBe("Great East Court · Room 112");
  });
});
