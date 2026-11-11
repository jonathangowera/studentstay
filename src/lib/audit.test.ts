import { describe, expect, it } from "vitest";
import { actionLabel, formatCat, pageCount, pageRange, parsePage, shortId } from "./audit";

describe("actionLabel", () => {
  it.each([
    ["applications.status_changed", "Application status changed"],
    ["beds.state_changed", "Bed state changed"],
    ["listings.created", "Listing created"],
    ["documents.review_decision_changed", "Document review changed"],
    ["profiles.role_changed", "Profile role changed"],
    ["allocation.decision", "Allocation decided"],
    ["announcement.sent", "Announcement sent"],
    ["something_else", "Something else"],
  ])("%s reads as %s", (action, label) => {
    expect(actionLabel(action)).toBe(label);
  });
});

describe("paging", () => {
  it("reads the page number safely", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("2abc")).toBe(1);
    expect(parsePage(["4", "5"])).toBe(4);
  });

  it("shows 25 rows per page", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 24 });
    expect(pageRange(3)).toEqual({ from: 50, to: 74 });
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
  });
});

describe("display", () => {
  it("shortens UUIDs only", () => {
    expect(shortId("0f8c2a1e-1111-2222-3333-444455556666")).toBe("0f8c2a1e");
    expect(shortId("APP-2026-0412")).toBe("APP-2026-0412");
    expect(shortId(null)).toBe("");
  });

  it("formats times in Central Africa Time", () => {
    expect(formatCat("2026-11-11T10:05:00Z")).toBe("11 Nov 2026, 12:05 CAT");
  });
});
