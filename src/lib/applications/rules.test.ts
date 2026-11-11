import { describe, expect, it } from "vitest";
import { canWithdraw, isApplicationReference, openApplicationTo, openUniversityApplication, universityStartDecision, type AppSummary } from "./rules";
import { notificationHref, applicationRedirect } from "@/lib/notifications";

const app = (over: Partial<AppSummary & { listing_id: string | null }>): AppSummary & { listing_id: string | null } => ({
  reference: "APP-2026-0001",
  route: "university_allocation",
  status: "submitted",
  created_at: "2026-11-01T00:00:00Z",
  listing_id: null,
  ...over,
});

describe("one open university allocation application", () => {
  it("allows a new one when there is none or only closed ones", () => {
    expect(universityStartDecision([])).toEqual({ kind: "new" });
    const closed = [app({ status: "withdrawn" }), app({ status: "declined" }), app({ status: "no_eligible_room" }), app({ status: "expired" })];
    expect(universityStartDecision(closed)).toEqual({ kind: "new" });
  });

  it("ignores private applications", () => {
    expect(universityStartDecision([app({ route: "private", status: "under_review", listing_id: "x" })])).toEqual({ kind: "new" });
  });

  it("blocks a second one while one is open", () => {
    const open = app({ reference: "APP-2026-0412", status: "pending_approval" });
    expect(universityStartDecision([open, app({ status: "withdrawn" })])).toEqual({ kind: "blocked", app: open });
    expect(universityStartDecision([app({ status: "approved" })]).kind).toBe("blocked");
  });

  it("sends the student back to a draft or profile incomplete application", () => {
    const draft = app({ reference: "APP-2026-0500", status: "profile_incomplete" });
    expect(universityStartDecision([draft])).toEqual({ kind: "continue", app: draft });
  });

  it("picks the newest open one", () => {
    const older = app({ reference: "A", created_at: "2026-10-01T00:00:00Z" });
    const newer = app({ reference: "B", created_at: "2026-11-05T00:00:00Z" });
    expect(openUniversityApplication([older, newer])?.reference).toBe("B");
  });
});

describe("openApplicationTo", () => {
  it("finds an open application to that place only", () => {
    const apps = [app({ route: "private", listing_id: "p1", status: "declined" }), app({ route: "private", listing_id: "p1", status: "accepted", reference: "OK" })];
    expect(openApplicationTo(apps, "p1")?.reference).toBe("OK");
    expect(openApplicationTo(apps, "p2")).toBeNull();
  });
});

describe("canWithdraw", () => {
  const transitions = [
    { machine: "application", from_state: "pending_approval", to_state: "withdrawn" },
    { machine: "application", from_state: "draft", to_state: "submitted" },
    { machine: "booking", from_state: "declined", to_state: "withdrawn" },
  ];
  it("follows the state_transitions table", () => {
    expect(canWithdraw("pending_approval", transitions)).toBe(true);
    expect(canWithdraw("draft", transitions)).toBe(false);
    expect(canWithdraw("declined", transitions)).toBe(false);
  });
});

describe("references and notification links", () => {
  it("recognises APP-YYYY-NNNN only", () => {
    expect(isApplicationReference("APP-2026-0412")).toBe(true);
    expect(isApplicationReference("APP-2026-12345")).toBe(true);
    expect(isApplicationReference("APP-26-0412")).toBe(false);
    expect(isApplicationReference("app-2026-0412")).toBe(false);
    expect(isApplicationReference("APP-2026-0412/../x")).toBe(false);
  });

  it("redirects old application links to the student pages", () => {
    expect(applicationRedirect("APP-2026-0412")).toBe("/student/applications/APP-2026-0412");
    expect(applicationRedirect("<script>")).toBe("/student/applications");
    expect(notificationHref("/applications/APP-2026-0412")).toBe("/student/applications/APP-2026-0412");
    expect(notificationHref("/applications/nonsense")).toBe("/student/applications");
  });

  it("follows only links inside this site", () => {
    expect(notificationHref("/student/profile")).toBe("/student/profile");
    expect(notificationHref("https://example.com")).toBeNull();
    expect(notificationHref("//example.com")).toBeNull();
    expect(notificationHref("/\\example.com")).toBeNull();
    expect(notificationHref(null)).toBeNull();
  });
});
