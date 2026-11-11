import { describe, expect, it } from "vitest";
import { heartModeFor } from "./shortlist";

describe("heartModeFor", () => {
  it("shows a sign-in heart to visitors", () => {
    expect(heartModeFor(null)).toBe("guest");
    expect(heartModeFor(undefined)).toBe("guest");
  });
  it("lets students save", () => {
    expect(heartModeFor("student")).toBe("student");
  });
  it("hides the heart from owners, administrators and technicians", () => {
    for (const r of ["owner", "university_admin", "technician", "system_admin"] as const) {
      expect(heartModeFor(r)).toBe("hidden");
    }
  });
});
