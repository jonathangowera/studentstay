import { describe, expect, it } from "vitest";
import { MESSAGES, extractErrorCode, makeReference, toFriendlyError } from "./errors";

describe("extractErrorCode", () => {
  it("uses the code before the colon in a database message", () => {
    expect(extractErrorCode({ code: "P0001", message: "BED_UNAVAILABLE: this bed is no longer free" })).toBe(
      "BED_UNAVAILABLE",
    );
    expect(
      extractErrorCode({ code: "P0001", message: "INVALID_TRANSITION: a bed cannot change from occupied to held" }),
    ).toBe("INVALID_TRANSITION");
  });

  it("falls back to SQLSTATE when there is no prefix", () => {
    expect(extractErrorCode({ code: "42501", message: "permission denied for table audit_events" })).toBe("42501");
    expect(extractErrorCode({ code: "23514", message: 'new row violates check constraint "x"' })).toBe("23514");
    expect(extractErrorCode({ code: "23P01", message: "conflicting key value violates exclusion constraint" })).toBe(
      "23P01",
    );
  });

  it("recognises the student number unique index", () => {
    expect(
      extractErrorCode({
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_student_number_uq"',
      }),
    ).toBe("STUDENT_NUMBER_TAKEN");
    expect(
      extractErrorCode({ code: "23505", message: "duplicate key", details: "profiles_student_number_uq" }),
    ).toBe("STUDENT_NUMBER_TAKEN");
  });

  it("keeps other unique violations generic", () => {
    expect(extractErrorCode({ code: "23505", message: 'duplicate key value violates unique constraint "other"' })).toBe(
      "23505",
    );
  });

  it("uses Supabase Auth error codes", () => {
    expect(extractErrorCode({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "invalid_credentials",
    );
  });

  it("does not treat a lower-case sentence with a colon as a code", () => {
    expect(extractErrorCode({ message: "Error: something" })).toBe("UNKNOWN");
  });

  it("handles strings, null and odd values", () => {
    expect(extractErrorCode("NOT_ALLOWED: nope")).toBe("NOT_ALLOWED");
    expect(extractErrorCode(null)).toBe("UNKNOWN");
    expect(extractErrorCode(42)).toBe("UNKNOWN");
  });
});

describe("toFriendlyError", () => {
  it.each([
    ["BED_UNAVAILABLE: x", "That bed was just taken. Here are other options."],
    ["INVALID_TRANSITION: x", "That change is not possible from the current status."],
    ["NOT_ALLOWED: x", "You do not have access to do that."],
    ["ALREADY_DECIDED: x", "This has already been decided."],
    ["NOTE_REQUIRED: x", "Please give a reason."],
    ["BED_NOT_ELIGIBLE: x", "Choose one of the eligible rooms."],
    ["BED_REQUIRED: x", "Choose the bed to hold."],
    ["EMAIL_NOT_VERIFIED: x", "Verify your email before applying."],
    ["REOPEN_WINDOW_PASSED: x", "This request can no longer be reopened. Please report a new one."],
    ["NOT_A_TECHNICIAN: x", "Choose a technician."],
    ["ALREADY_SENT: x", "This announcement has already been sent."],
    ["BED_NOT_FOUND: x", "Something went wrong. Please try again."],
    ["BAD_STATE: x", "Something went wrong. Please try again."],
    ["AUDIT_IMMUTABLE: x", "Something went wrong. Please try again."],
  ])("maps %s from the database reference table", (message, expected) => {
    expect(toFriendlyError({ code: "P0001", message }).message).toBe(expected);
  });

  it("maps 42501 like NOT_ALLOWED", () => {
    expect(toFriendlyError({ code: "42501", message: "permission denied" }).message).toBe(MESSAGES.NOT_ALLOWED);
  });

  it("uses the agreed wording for a student number that cannot be used", () => {
    const f = toFriendlyError({ code: "23505", message: 'violates unique constraint "profiles_student_number_uq"' });
    expect(f.message).toBe("This student number cannot be used. Check it, or contact your accommodation office.");
  });

  it("never returns the raw database text", () => {
    const raw = "BED_UNAVAILABLE: bed 1234-secret-id is held by user abc";
    expect(toFriendlyError({ message: raw }).message).not.toContain("1234");
    expect(toFriendlyError({ message: "some unexpected internal failure" }).message).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("always includes a reference code", () => {
    expect(toFriendlyError(new Error("x")).reference).toMatch(/^REF-[A-Z2-9]{6}$/);
  });
});

describe("makeReference", () => {
  it("is deterministic with a fixed random source and avoids look-alike characters", () => {
    expect(makeReference(() => 0)).toBe("REF-AAAAAA");
    const ref = makeReference(() => 0.9999);
    expect(ref).toMatch(/^REF-[A-Z2-9]{6}$/);
    expect(ref).not.toMatch(/[01IOL]/);
  });
});

describe("S4 application errors", () => {
  it("maps the one-open-application index to the duplicate message, not the student number one", () => {
    const err = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "applications_one_open_per_listing"',
      details: "Key (student_id, listing_id)=(...) already exists.",
    };
    expect(extractErrorCode(err)).toBe("DUPLICATE_APPLICATION");
    expect(toFriendlyError(err).message).toBe("You already have an open application to this place.");
  });

  it("maps EMAIL_NOT_VERIFIED by its code even though the SQLSTATE is 42501", () => {
    const err = { code: "42501", message: "EMAIL_NOT_VERIFIED: verify your email before applying" };
    expect(extractErrorCode(err)).toBe("EMAIL_NOT_VERIFIED");
    expect(toFriendlyError(err).message).toBe("Verify your email before applying.");
  });

  it("has friendly wording for the app-level checks", () => {
    expect(toFriendlyError({ message: "UNIVERSITY_APPLICATION_OPEN: one at a time" }).message).toBe(
      "You already have an open university allocation application.",
    );
    expect(toFriendlyError({ message: "WITHDRAW_NOT_ALLOWED: closed" }).message).toBe("This application can no longer be withdrawn.");
  });
});
