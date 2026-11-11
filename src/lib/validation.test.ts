import { describe, expect, it } from "vitest";
import {
  isPasswordValid,
  parseBusiness,
  parseProfile,
  parseSignUp,
  passwordRules,
  resetsConfirmation,
} from "./validation";

function form(values: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  return fd;
}

describe("password rules", () => {
  it("checks length, a letter and a number", () => {
    expect(passwordRules("abc").map((r) => r.met)).toEqual([false, true, false]);
    expect(passwordRules("12345678").map((r) => r.met)).toEqual([true, false, true]);
    expect(isPasswordValid("demo-pass-2026")).toBe(true);
    expect(isPasswordValid("short1")).toBe(false);
  });
});

describe("parseSignUp", () => {
  it("accepts student or owner only", () => {
    const base = { full_name: "Demo Person", email: "demo@example.com", password: "letters123" };
    expect(parseSignUp(form({ ...base, role: "owner" })).ok).toBe(true);
    const r = parseSignUp(form({ ...base, role: "system_admin" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toBeDefined();
  });
});

describe("parseProfile", () => {
  const student = {
    full_name: "Demo Student",
    phone: "+260 97 000 0000",
    institution_id: "11111111-2222-3333-4444-555555555555",
    student_number: "100-001",
    study_year: "2",
    preferred_room_type: "double",
    budget_zmw: "2,000",
    preferred_facilities: ["wifi", "study"],
    notify_sms: "on",
  };

  it("parses a student's fields", () => {
    const r = parseProfile(form(student), "student");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.budget_zmw).toBe(2000);
      expect(r.data.study_year).toBe(2);
      expect(r.data.notify_sms).toBe(true);
      expect(r.data.owner_can_see_profile).toBe(false);
      expect(r.data.preferred_facilities).toEqual(["wifi", "study"]);
    }
  });

  it("never includes role or the confirmation flag", () => {
    const r = parseProfile(form({ ...student, role: "system_admin", student_number_matched: "true" }), "student");
    expect(r.ok && ("role" in r.data || "student_number_matched" in r.data)).toBe(false);
  });

  it("ignores student fields for other roles", () => {
    const r = parseProfile(form(student), "owner");
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.data).sort()).toEqual(["emergency_contact", "full_name", "notify_sms", "phone"]);
  });

  it("rejects unknown facilities and bad years", () => {
    const r = parseProfile(form({ ...student, preferred_facilities: ["pool"], study_year: "9" }), "student");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.preferred_facilities).toBeDefined();
      expect(r.errors.study_year).toBeDefined();
    }
  });
});

describe("resetsConfirmation", () => {
  const before = { institution_id: "a", student_number: "1" };
  it("is true when the number or institution changes", () => {
    expect(resetsConfirmation(before, { institution_id: "a", student_number: "2" })).toBe(true);
    expect(resetsConfirmation(before, { institution_id: "b", student_number: "1" })).toBe(true);
    expect(resetsConfirmation(before, { institution_id: "a", student_number: "1", full_name: "x" })).toBe(false);
  });
});

describe("parseBusiness", () => {
  it("needs a business name", () => {
    expect(parseBusiness(form({ business_name: "" })).ok).toBe(false);
    expect(parseBusiness(form({ business_name: "Demo Rentals", contact_phone: "" })).ok).toBe(true);
  });
});
