import { describe, expect, it } from "vitest";
import {
  daysSince,
  formatDateTimeCAT,
  formatDistance,
  formatKm,
  formatKwacha,
  formatUpdated,
  perUnit,
  priceRange,
  staleNote,
} from "./format";

describe("formatKwacha", () => {
  it("writes kwacha like K1,350", () => {
    expect(formatKwacha(1350)).toBe("K1,350");
    expect(formatKwacha(900)).toBe("K900");
    expect(formatKwacha(12500)).toBe("K12,500");
    expect(formatKwacha("3600.00")).toBe("K3,600");
  });
  it("keeps two decimals when there are cents", () => {
    expect(formatKwacha(1350.5)).toBe("K1,350.50");
  });
  it("returns an empty string for missing values", () => {
    expect(formatKwacha(null)).toBe("");
    expect(formatKwacha(undefined)).toBe("");
    expect(formatKwacha("abc")).toBe("");
  });
});

describe("prices", () => {
  it("says per month or per term", () => {
    expect(perUnit("month")).toBe("per month");
    expect(perUnit("term")).toBe("per term");
    expect(perUnit(null)).toBe("per month");
  });
  it("shows one price or a range", () => {
    expect(priceRange(1350, 1350, "month")).toBe("K1,350 per month");
    expect(priceRange(1350, 2400, "month")).toBe("K1,350 to K2,400 per month");
    expect(priceRange(3600, null, "term")).toBe("K3,600 per term");
    expect(priceRange(null, null, "month")).toBe("Price not listed");
  });
});

describe("distances", () => {
  it("writes 1.1 km to UNZA", () => {
    expect(formatDistance(1.1, "UNZA")).toBe("1.1 km to UNZA");
    expect(formatDistance("0.3", "UNZA")).toBe("0.3 km to UNZA");
    expect(formatKm(2)).toBe("2.0 km");
  });
});

describe("dates in Central Africa Time", () => {
  const now = new Date("2026-11-11T10:00:00Z"); // 12:00 in Lusaka

  it("counts calendar days in Lusaka, not UTC", () => {
    // 22:30 UTC on 10 Nov is 00:30 on 11 Nov in Lusaka, so it is "today".
    expect(daysSince("2026-11-10T22:30:00Z", now)).toBe(0);
    expect(daysSince("2026-11-10T21:30:00Z", now)).toBe(1);
    expect(daysSince("2026-10-08T10:00:00Z", now)).toBe(34);
  });
  it("never goes negative", () => {
    expect(daysSince("2026-11-20T10:00:00Z", now)).toBe(0);
  });
  it("writes the updated line", () => {
    expect(formatUpdated("2026-11-11T08:00:00Z", now)).toBe("Updated today");
    expect(formatUpdated("2026-11-10T08:00:00Z", now)).toBe("Updated 1 day ago");
    expect(formatUpdated("2026-11-09T08:00:00Z", now)).toBe("Updated 2 days ago");
  });
  it("writes the stale note", () => {
    expect(staleNote("2026-10-08T10:00:00Z", now)).toBe("Not updated for 34 days. Confirm availability before applying.");
  });
  it("shows the full time with CAT", () => {
    expect(formatDateTimeCAT("2026-11-11T12:05:00Z")).toBe("11 Nov 2026, 14:05 CAT");
  });
});
