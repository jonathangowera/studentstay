import { describe, expect, it } from "vitest";
import {
  INSERT_COLUMNS,
  UPDATE_COLUMNS,
  draftInsertFor,
  draftUpdateFor,
  parseApplicationEdit,
  parseNewApplication,
  policyWarnings,
  profilePatchFor,
  type NewApplication,
} from "./wizard";

const UNZA = "11111111-1111-4111-8111-111111111111";
const EHC = "22222222-2222-4222-8222-222222222222";
const PLACE = "33333333-3333-4333-8333-333333333333";

function form(values: Record<string, string | string[]>) {
  return {
    get: (k: string) => {
      const v = values[k];
      return Array.isArray(v) ? v[0] : (v ?? null);
    },
    getAll: (k: string) => {
      const v = values[k];
      return v === undefined ? [] : Array.isArray(v) ? v : [v];
    },
  };
}

const prefs = { requested_room_type: "double", budget_zmw: "1,500", gender_needed: "female_only", intake: "Semester I 2027" };
const ctx = { activeInstitutionIds: [UNZA], listingId: PLACE };

describe("parseNewApplication", () => {
  it("accepts a university allocation with an active institution and a student number", () => {
    const r = parseNewApplication(
      form({ route: "university_allocation", institution_id: UNZA, student_number: "108-397", ...prefs, preferred_facilities: ["study", "wifi"] }),
      ctx,
    );
    expect(r).toEqual({
      ok: true,
      data: {
        route: "university_allocation",
        institution_id: UNZA,
        student_number: "108-397",
        listing_id: null,
        requested_room_type: "double",
        budget_zmw: 1500,
        gender_needed: "female_only",
        intake: "Semester I 2027",
        preferred_facilities: ["wifi", "study"],
      },
    });
  });

  it("refuses an institution that is not active, and a missing student number", () => {
    const r = parseNewApplication(form({ route: "university_allocation", institution_id: EHC, student_number: "", ...prefs }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.institution_id).toBeTruthy();
      expect(r.errors.student_number).toBe("Enter your student number.");
    }
  });

  it("needs the listing the student came from for a private application", () => {
    expect(parseNewApplication(form({ route: "private", listing_id: PLACE, ...prefs }), ctx).ok).toBe(true);
    const other = parseNewApplication(form({ route: "private", listing_id: UNZA, ...prefs }), ctx);
    expect(other.ok).toBe(false);
    const none = parseNewApplication(form({ route: "private", listing_id: PLACE, ...prefs }), { ...ctx, listingId: null });
    expect(none.ok).toBe(false);
  });

  it("ignores institution and student number on a private application", () => {
    const r = parseNewApplication(form({ route: "private", listing_id: PLACE, institution_id: UNZA, student_number: "x", ...prefs }), ctx);
    expect(r.ok && r.data.institution_id).toBe(null);
    expect(r.ok && r.data.student_number).toBe(null);
  });

  it("validates every preference", () => {
    const r = parseNewApplication(
      form({ route: "nope", requested_room_type: "castle", budget_zmw: "lots", gender_needed: "x", intake: "Semester III 2030", preferred_facilities: ["pool"] }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["budget_zmw", "gender_needed", "intake", "preferred_facilities", "requested_room_type", "route"]);
    }
  });

  it("checks the budget range and format", () => {
    const b = (v: string) => parseApplicationEdit(form({ ...prefs, budget_zmw: v }));
    expect(b("K1,350").ok).toBe(true);
    expect(b("0").ok).toBe(false);
    expect(b("100001").ok).toBe(false);
    expect(b("1350.50").ok).toBe(false);
    expect(b("").ok).toBe(false);
  });

  it("does not accept 'close to campus' as a facility", () => {
    expect(parseApplicationEdit(form({ ...prefs, preferred_facilities: ["close_to_campus"] })).ok).toBe(false);
  });
});

describe("rows written to the database (correction A and B)", () => {
  const uni: NewApplication = {
    route: "university_allocation",
    institution_id: UNZA,
    student_number: "108-397",
    listing_id: null,
    requested_room_type: "double",
    budget_zmw: 1500,
    gender_needed: "female_only",
    intake: "Semester I 2027",
    preferred_facilities: ["wifi"],
  };

  it("saves institution and student number to the profile only when they change", () => {
    expect(profilePatchFor(uni, { institution_id: null, student_number: null })).toEqual({ institution_id: UNZA, student_number: "108-397" });
    expect(profilePatchFor(uni, { institution_id: UNZA, student_number: "108-397" })).toBeNull();
    const priv: NewApplication = { ...uni, route: "private", listing_id: PLACE, institution_id: null, student_number: null };
    expect(profilePatchFor(priv, { institution_id: null, student_number: null })).toBeNull();
  });

  it("inserts exactly the columns the browser may insert, never status", () => {
    const row = draftInsertFor(uni, "student-1");
    expect(Object.keys(row).sort()).toEqual([...INSERT_COLUMNS].sort());
    expect(row).not.toHaveProperty("status");
    expect(row).not.toHaveProperty("student_number");
    expect(row.institution_id).toBe(UNZA);
  });

  it("updates exactly the five columns the browser may update", () => {
    const row = draftUpdateFor(uni);
    expect(Object.keys(row).sort()).toEqual([...UPDATE_COLUMNS].sort());
    expect([...UPDATE_COLUMNS].sort()).toEqual(["budget_zmw", "gender_needed", "intake", "preferred_facilities", "requested_room_type"]);
  });

  it("ignores route, institution and listing when editing", () => {
    const r = parseApplicationEdit(form({ ...prefs, route: "private", institution_id: EHC, listing_id: PLACE }));
    expect(r.ok && Object.keys(r.data).sort()).toEqual(["budget_zmw", "gender_needed", "intake", "preferred_facilities", "requested_room_type"]);
  });
});

describe("policyWarnings", () => {
  const place = {
    gender: "female_only" as const,
    rent_unit: "month",
    rooms: [
      { room_type: "double" as const, price_zmw: 2100 },
      { room_type: "triple" as const, price_zmw: 1600 },
    ],
  };

  it("warns about a different gender policy, a missing room type and a low budget", () => {
    expect(policyWarnings({ gender_needed: "mixed", requested_room_type: "single", budget_zmw: 3000 }, place)).toEqual([
      "This place is female only. You chose mixed.",
      "This place has no single rooms.",
    ]);
    expect(policyWarnings({ gender_needed: "female_only", requested_room_type: "double", budget_zmw: 1500 }, place)).toEqual([
      "The cheapest double room here is K2,100 per month. Your budget is K1,500.",
    ]);
  });

  it("has nothing to say when the choices fit", () => {
    expect(policyWarnings({ gender_needed: "female_only", requested_room_type: "triple", budget_zmw: 1600 }, place)).toEqual([]);
  });
});
