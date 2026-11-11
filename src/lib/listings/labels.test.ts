import { describe, expect, it } from "vitest";
import {
  BED_STATES,
  bedsBadge,
  cardDistances,
  distanceEntries,
  facilityList,
  institutionShortName,
  verificationBadge,
} from "./labels";

describe("verificationBadge", () => {
  it("uses exactly the three approved texts", () => {
    expect(verificationBadge("verified").label).toBe("Verified listing information");
    expect(verificationBadge("pending").label).toBe("Verification pending");
    expect(verificationBadge("requires_review").label).toBe("Requires review");
    expect(verificationBadge("resubmission_required").label).toBe("Requires review");
    expect(verificationBadge(null).label).toBe("Verification pending");
  });
  it("always has an icon as well as a colour", () => {
    for (const v of ["verified", "pending", "requires_review"]) {
      const b = verificationBadge(v);
      expect(b.icon).toBeTruthy();
      expect(b.tone).toBeTruthy();
    }
  });
  it("never uses forbidden words", () => {
    const forbidden = /safe|secure|legal|guarantee|genuine/i;
    for (const v of ["verified", "pending", "requires_review", "resubmission_required"]) {
      expect(verificationBadge(v).label).not.toMatch(forbidden);
    }
  });
});

describe("bedsBadge", () => {
  it("counts beds in plain English", () => {
    expect(bedsBadge(0).label).toBe("No beds available");
    expect(bedsBadge(1).label).toBe("1 bed available");
    expect(bedsBadge(9).label).toBe("9 beds available");
    expect(bedsBadge(null).label).toBe("No beds available");
  });
});

describe("bed states", () => {
  it("lists all six states, each with a label and an icon", () => {
    expect(BED_STATES.map((b) => b.state)).toEqual([
      "available",
      "held",
      "pending_approval",
      "reserved",
      "occupied",
      "blocked_for_maintenance",
    ]);
    for (const b of BED_STATES) {
      expect(b.label).toBeTruthy();
      expect(b.icon).toBeTruthy();
    }
  });
});

describe("facilities and distances", () => {
  it("orders known facilities and keeps unknown ones", () => {
    expect(facilityList(["study", "wifi", "pool"]).map((f) => f.label)).toEqual(["Wi-Fi", "Study room", "Pool"]);
    expect(facilityList(null)).toEqual([]);
  });
  it("reads the distances JSON nearest first", () => {
    expect(distanceEntries({ CAVENDISH: 7.4, UNZA: 1.1 })).toEqual([
      { code: "UNZA", km: 1.1 },
      { code: "CAVENDISH", km: 7.4 },
    ]);
    expect(distanceEntries(null)).toEqual([]);
    expect(distanceEntries([1, 2])).toEqual([]);
  });
  it("puts the chosen institution first on cards", () => {
    const d = { UNZA: 1.1, CAVENDISH: 7.4, ZCAS: 3 };
    expect(cardDistances(d, "CAVENDISH").map((x) => x.code)).toEqual(["CAVENDISH", "UNZA"]);
    expect(cardDistances(d, null).map((x) => x.code)).toEqual(["UNZA", "ZCAS"]);
  });
  it("uses the design's short institution names", () => {
    expect(institutionShortName("CAVENDISH")).toBe("Cavendish University");
    expect(institutionShortName("NEW", "New College")).toBe("New College");
  });
});
