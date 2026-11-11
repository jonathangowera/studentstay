import { describe, expect, it } from "vitest";
import { latestOpen, nextSteps, type DashboardFacts } from "./dashboard";

const base: DashboardFacts = {
  emailVerified: true,
  profile: { institution_id: "i", student_number: "108-397", emergency_contact: "+260 97 000 0000" },
  apps: [],
  shortlistCount: 0,
  unreadCount: 0,
};

const keys = (f: Partial<DashboardFacts>) => nextSteps({ ...base, ...f }).map((s) => s.key);

describe("nextSteps", () => {
  it("suggests finding a place when there is no open application", () => {
    expect(keys({})).toEqual(["browse"]);
  });

  it("asks for an unverified email first", () => {
    expect(keys({ emailVerified: false })[0]).toBe("verify");
  });

  it("sends the student back to an unfinished application", () => {
    const s = nextSteps({ ...base, apps: [{ reference: "APP-2026-0499", route: "university_allocation", status: "profile_incomplete" }] });
    expect(s.map((x) => x.key)).toEqual(["finish"]);
    expect(s[0].href).toBe("/apply?application=APP-2026-0499");
  });

  it("asks for missing student details, otherwise an emergency contact", () => {
    expect(keys({ profile: { institution_id: null, student_number: null, emergency_contact: null } })).toContain("student-details");
    expect(keys({ profile: { ...base.profile, emergency_contact: null } })).toContain("profile");
  });

  it("suggests a backup while an application is open, using the shortlist when there is one", () => {
    const apps = [{ reference: "APP-2026-0412", route: "university_allocation" as const, status: "pending_approval" as const }];
    expect(nextSteps({ ...base, apps }).find((s) => s.key === "backup")?.href).toBe("/listings");
    expect(nextSteps({ ...base, apps, shortlistCount: 2 }).find((s) => s.key === "backup")?.href).toBe("/student/shortlist");
  });

  it("points to unread updates and never shows more than four steps", () => {
    const s = nextSteps({
      ...base,
      emailVerified: false,
      profile: { institution_id: null, student_number: null, emergency_contact: null },
      apps: [{ reference: "APP-2026-0499", route: "university_allocation", status: "draft" }],
      unreadCount: 3,
    });
    expect(s).toHaveLength(4);
    expect(s.map((x) => x.key)).toEqual(["verify", "finish", "student-details", "updates"]);
    expect(nextSteps({ ...base, unreadCount: 1 }).find((x) => x.key === "updates")?.text).toBe("You have 1 unread update.");
  });
});

describe("latestOpen", () => {
  it("skips closed applications", () => {
    expect(latestOpen([{ status: "withdrawn" as const }, { status: "submitted" as const }])).toEqual({ status: "submitted" });
    expect(latestOpen([{ status: "declined" as const }])).toBeNull();
  });
});
