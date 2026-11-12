import { describe, expect, it } from "vitest";
import { applyNotice, withdrawNotice } from "./messages";

describe("applyNotice", () => {
  it("links a duplicate to the open application", () => {
    expect(applyNotice("DUPLICATE_APPLICATION", "APP-2026-0301")).toEqual({
      message: "You already have an open application to this place.",
      link: { href: "/student/applications/APP-2026-0301", label: "View your application" },
    });
  });

  it("explains an unverified email without a link", () => {
    expect(applyNotice("EMAIL_NOT_VERIFIED").message).toMatch(/^Verify your email before applying/);
  });

  it("offers to continue a draft and blocks a second open university application", () => {
    expect(applyNotice("CONTINUE_APPLICATION", "APP-2026-0499").link).toEqual({
      href: "/apply?application=APP-2026-0499",
      label: "Continue your application",
    });
    expect(applyNotice("UNIVERSITY_APPLICATION_OPEN", "APP-2026-0412")).toEqual({
      message: "You already have an open university allocation application.",
      link: { href: "/student/applications/APP-2026-0412", label: "View your application" },
    });
  });

  it("says a draft was saved when a database error came after the insert", () => {
    const n = applyNotice("NOT_ALLOWED", "APP-2026-0500");
    expect(n.message).toBe("You do not have access to do that. Your application was saved as a draft.");
    expect(n.link?.href).toBe("/apply?application=APP-2026-0500");
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(applyNotice("WHO_KNOWS")).toEqual({ message: "Something went wrong. Please try again." });
  });
});

describe("withdrawNotice", () => {
  it("maps a refused change to plain words", () => {
    expect(withdrawNotice("INVALID_TRANSITION").message).toBe("This application can no longer be withdrawn.");
    expect(withdrawNotice("WITHDRAW_NOT_ALLOWED").message).toBe("This application can no longer be withdrawn.");
    expect(withdrawNotice("42501").message).toBe("You do not have access to do that.");
  });
});
