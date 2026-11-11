import { describe, expect, it } from "vitest";
import {
  CLOSED_STATUSES,
  STATUS_LABEL,
  isEditable,
  isOpen,
  missingFromReason,
  progressFor,
  statusExplanation,
  statusPill,
  timelineFrom,
  type ApplicationStatus,
} from "./status";

const ALL: ApplicationStatus[] = [
  "draft",
  "submitted",
  "profile_incomplete",
  "under_review",
  "recommended",
  "pending_approval",
  "approved",
  "accepted",
  "declined",
  "no_eligible_room",
  "withdrawn",
  "expired",
];

describe("status labels", () => {
  it("uses the agreed label for every status", () => {
    expect(ALL.map((s) => STATUS_LABEL[s])).toEqual([
      "Draft",
      "Submitted",
      "Profile incomplete",
      "Under review",
      "Recommended",
      "Waiting for administrator approval",
      "Approved",
      "Accepted",
      "Declined",
      "No eligible room",
      "Withdrawn",
      "Expired",
    ]);
  });

  it("gives every status an icon as well as a colour and text", () => {
    for (const s of ALL) {
      const p = statusPill(s);
      expect(p.icon).toBeTruthy();
      expect(p.tone).toBeTruthy();
      expect(p.label).toBe(STATUS_LABEL[s]);
    }
  });

  it("never calls a recommendation approved or allocated", () => {
    for (const s of ["recommended", "pending_approval"] as const) {
      for (const route of ["university_allocation", "private"] as const) {
        const text = `${STATUS_LABEL[s]} ${statusExplanation(s, route)}`.toLowerCase();
        expect(text).not.toMatch(/\bapproved\b|\ballocated\b/);
      }
    }
    expect(statusExplanation("pending_approval", "university_allocation")).toContain("only after they approve it");
  });

  it("has an explanation for every status and route with no em dashes", () => {
    for (const s of ALL) {
      for (const route of ["university_allocation", "private"] as const) {
        const t = statusExplanation(s, route);
        expect(t.length).toBeGreaterThan(20);
        expect(t).not.toContain("—");
      }
    }
  });

  it("treats the same statuses as closed as the database index", () => {
    expect([...CLOSED_STATUSES].sort()).toEqual(["declined", "expired", "no_eligible_room", "withdrawn"]);
    expect(isOpen("pending_approval")).toBe(true);
    expect(isOpen("approved")).toBe(true);
    expect(isOpen("withdrawn")).toBe(false);
  });

  it("lets only draft and profile incomplete be edited", () => {
    expect(ALL.filter(isEditable)).toEqual(["draft", "profile_incomplete"]);
  });
});

describe("progressFor", () => {
  it("shows university steps up to administrator review for a recommendation", () => {
    const p = progressFor("pending_approval", "university_allocation")!;
    expect(p.steps.map((s) => `${s.label}:${s.state}`)).toEqual([
      "Submitted:done",
      "Recommended:done",
      "Administrator review:now",
      "Approved:todo",
    ]);
    expect(p.percent).toBe(50);
  });

  it("completes the university steps when approved", () => {
    expect(progressFor("approved", "university_allocation")!.percent).toBe(100);
  });

  it("uses owner steps for a private application", () => {
    const p = progressFor("under_review", "private")!;
    expect(p.steps.map((s) => s.label)).toEqual(["Submitted", "Owner review", "Accepted", "Deposit"]);
    expect(p.steps[1].state).toBe("now");
    expect(progressFor("accepted", "private")!.steps[3].state).toBe("now");
  });

  it("has no progress for closed applications", () => {
    for (const s of CLOSED_STATUSES) expect(progressFor(s, "university_allocation")).toBeNull();
  });
});

describe("timelineFrom", () => {
  it("orders events oldest first, labels them and marks the last one as current", () => {
    const items = timelineFrom([
      { from_status: "submitted", to_status: "recommended", note: null, created_at: "2026-11-11T07:20:00Z" },
      { from_status: null, to_status: "draft", note: null, created_at: "2026-11-11T07:10:00Z" },
      { from_status: "draft", to_status: "submitted", note: "  ", created_at: "2026-11-11T07:14:00Z" },
      { from_status: "recommended", to_status: "pending_approval", note: "Riverside Hall", created_at: "2026-11-11T07:20:01Z" },
    ]);
    expect(items.map((i) => i.label)).toEqual(["Draft", "Submitted", "Recommended", "Waiting for administrator approval"]);
    expect(items.map((i) => i.current)).toEqual([false, false, false, true]);
    expect(items[1].note).toBeNull();
    expect(items[3].note).toBe("Riverside Hall");
  });

  it("is empty when there are no events", () => {
    expect(timelineFrom([])).toEqual([]);
  });
});

describe("missingFromReason", () => {
  it("splits the reason and says where each item is fixed", () => {
    expect(missingFromReason("Missing: institution, student number, room type, budget")).toEqual([
      { label: "Institution", fixIn: "profile" },
      { label: "Student number", fixIn: "profile" },
      { label: "Room type", fixIn: "application" },
      { label: "Budget", fixIn: "application" },
    ]);
  });

  it("returns nothing for other reasons", () => {
    expect(missingFromReason(null)).toEqual([]);
    expect(missingFromReason("Sent back to be recommended again")).toEqual([]);
  });
});
