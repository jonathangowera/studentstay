/**
 * Apply wizard: validation of what the student sends, and the exact rows written to the database.
 * Pure and unit tested. The server action re-runs all of it; the browser checks are only for convenience.
 *
 * Order for a new application (see src/app/actions/applications.ts):
 *   1. university allocation only: save institution and student number to the PROFILE
 *      (submit_application checks the profile, not the application)
 *   2. insert the draft with the columns the browser may insert
 *   3. call submit_application
 * Editing a draft or profile incomplete application changes only the five columns the browser may update.
 */
import type { Database } from "@/lib/database.types";
import { formatKwacha, perUnit } from "@/lib/format";
import { FACILITY_KEYS, GENDERS, GENDER_LABEL, ROOM_TYPES, ROOM_TYPE_LABEL, type GenderPolicy, type RoomType } from "@/lib/listings/labels";
import type { FieldErrors, Parsed } from "@/lib/validation";
import type { ApplicationRoute } from "./status";

type Tables = Database["public"]["Tables"];
export type ApplicationInsert = Tables["applications"]["Insert"];
export type ApplicationUpdate = Tables["applications"]["Update"];

export const INTAKES = ["Semester I 2027", "Semester II 2027"] as const;
export type Intake = (typeof INTAKES)[number];

/** Highest budget accepted, in kwacha. Matches the listing search limit. */
export const MAX_BUDGET = 100_000;

/** Columns the browser may insert on applications (grant insert in the initial schema). */
export const INSERT_COLUMNS = [
  "student_id",
  "route",
  "institution_id",
  "listing_id",
  "requested_room_type",
  "budget_zmw",
  "gender_needed",
  "intake",
  "preferred_facilities",
] as const satisfies readonly (keyof ApplicationInsert)[];

/** Columns the browser may update on a draft or profile incomplete application (grant update). */
export const UPDATE_COLUMNS = [
  "requested_room_type",
  "budget_zmw",
  "gender_needed",
  "intake",
  "preferred_facilities",
] as const satisfies readonly (keyof ApplicationUpdate)[];

/** The preferences every application has. */
export type Preferences = {
  requested_room_type: RoomType;
  budget_zmw: number;
  gender_needed: GenderPolicy;
  intake: Intake;
  preferred_facilities: string[];
};

export type NewApplication = Preferences &
  (
    | { route: "university_allocation"; institution_id: string; student_number: string; listing_id: null }
    | { route: "private"; listing_id: string; institution_id: null; student_number: null }
  );

type FormLike = { get(name: string): unknown; getAll(name: string): unknown[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function parsePreferences(form: FormLike, errors: FieldErrors): Partial<Preferences> {
  const out: Partial<Preferences> = {};

  const room = text(form, "requested_room_type");
  if (!(ROOM_TYPES as readonly string[]).includes(room)) errors.requested_room_type = "Choose a room type.";
  else out.requested_room_type = room as RoomType;

  const budget = text(form, "budget_zmw").replace(/[,\s]/g, "").replace(/^K/i, "");
  if (budget === "") errors.budget_zmw = "Enter your monthly budget in kwacha.";
  else if (!/^\d{1,6}$/.test(budget)) errors.budget_zmw = "Enter a whole number of kwacha, like 1500.";
  else if (Number(budget) < 1 || Number(budget) > MAX_BUDGET) errors.budget_zmw = `Enter an amount from K1 to ${formatKwacha(MAX_BUDGET)}.`;
  else out.budget_zmw = Number(budget);

  const gender = text(form, "gender_needed");
  if (!(GENDERS as readonly string[]).includes(gender)) errors.gender_needed = "Choose who can stay.";
  else out.gender_needed = gender as GenderPolicy;

  const intake = text(form, "intake");
  if (!(INTAKES as readonly string[]).includes(intake)) errors.intake = "Choose an intake.";
  else out.intake = intake as Intake;

  const facilities = form.getAll("preferred_facilities").filter((v): v is string => typeof v === "string");
  if (facilities.some((f) => !FACILITY_KEYS.includes(f))) errors.preferred_facilities = "Choose facilities from the list.";
  else out.preferred_facilities = FACILITY_KEYS.filter((k) => facilities.includes(k));

  return out;
}

/**
 * A new application. `activeInstitutionIds` are the institutions that take university applications
 * (status active). A private application needs the listing the student came from.
 */
export function parseNewApplication(
  form: FormLike,
  ctx: { activeInstitutionIds: readonly string[]; listingId: string | null },
): Parsed<NewApplication> {
  const errors: FieldErrors = {};
  const route = text(form, "route") as ApplicationRoute;
  if (route !== "university_allocation" && route !== "private") errors.route = "Choose how you want to apply.";

  let institutionId = "";
  let studentNumber = "";
  let listingId = "";
  if (route === "university_allocation") {
    institutionId = text(form, "institution_id");
    if (!UUID.test(institutionId) || !ctx.activeInstitutionIds.includes(institutionId))
      errors.institution_id = "Choose your institution from the list.";
    studentNumber = text(form, "student_number");
    if (studentNumber === "") errors.student_number = "Enter your student number.";
    else if (studentNumber.length > 40) errors.student_number = "Use 40 characters or fewer.";
    else if (!/^[A-Za-z0-9/-]+$/.test(studentNumber)) errors.student_number = "Use only letters, numbers, dashes and slashes.";
  } else if (route === "private") {
    listingId = text(form, "listing_id");
    if (!UUID.test(listingId) || listingId !== ctx.listingId) errors.listing_id = "Choose a place to apply to first.";
  }

  const prefs = parsePreferences(form, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  const p = prefs as Preferences;
  return {
    ok: true,
    data:
      route === "university_allocation"
        ? { ...p, route, institution_id: institutionId, student_number: studentNumber, listing_id: null }
        : { ...p, route: "private", listing_id: listingId, institution_id: null, student_number: null },
  };
}

/** Editing a draft or profile incomplete application: only the preferences. Route and institution are fixed. */
export function parseApplicationEdit(form: FormLike): Parsed<Preferences> {
  const errors: FieldErrors = {};
  const prefs = parsePreferences(form, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: prefs as Preferences };
}

// ---------------------------------------------------------------- rows written to the database

/** Step 1 (university allocation only): the profile columns to save, or null when nothing changes. */
export function profilePatchFor(
  app: NewApplication,
  profile: { institution_id: string | null; student_number: string | null },
): { institution_id: string; student_number: string } | null {
  if (app.route !== "university_allocation") return null;
  if (profile.institution_id === app.institution_id && profile.student_number === app.student_number) return null;
  return { institution_id: app.institution_id, student_number: app.student_number };
}

/** Step 2: the draft row. Exactly the insert columns, nothing else (never status). */
export function draftInsertFor(app: NewApplication, studentId: string): Pick<ApplicationInsert, (typeof INSERT_COLUMNS)[number]> {
  return {
    student_id: studentId,
    route: app.route,
    institution_id: app.institution_id,
    listing_id: app.listing_id,
    requested_room_type: app.requested_room_type,
    budget_zmw: app.budget_zmw,
    gender_needed: app.gender_needed,
    intake: app.intake,
    preferred_facilities: app.preferred_facilities,
  };
}

/** Editing: exactly the five update columns. */
export function draftUpdateFor(prefs: Preferences): Pick<ApplicationUpdate, (typeof UPDATE_COLUMNS)[number]> {
  return {
    requested_room_type: prefs.requested_room_type,
    budget_zmw: prefs.budget_zmw,
    gender_needed: prefs.gender_needed,
    intake: prefs.intake,
    preferred_facilities: prefs.preferred_facilities,
  };
}

// ---------------------------------------------------------------- the place's own policy

export type PlacePolicy = {
  gender: GenderPolicy | null;
  rent_unit: string | null;
  rooms: { room_type: RoomType; price_zmw: number }[];
};

/**
 * Warnings for a private application whose choices do not match the place. They never block submission.
 * TODO(OD): hostel prices are per term and are compared as stored. The term length is an open decision.
 */
export function policyWarnings(
  prefs: Partial<Pick<Preferences, "requested_room_type" | "budget_zmw" | "gender_needed">>,
  place: PlacePolicy,
): string[] {
  const out: string[] = [];
  if (prefs.gender_needed && place.gender && prefs.gender_needed !== place.gender) {
    out.push(`This place is ${GENDER_LABEL[place.gender].toLowerCase()}. You chose ${GENDER_LABEL[prefs.gender_needed].toLowerCase()}.`);
  }
  if (prefs.requested_room_type) {
    const ofType = place.rooms.filter((r) => r.room_type === prefs.requested_room_type);
    const label = ROOM_TYPE_LABEL[prefs.requested_room_type].toLowerCase();
    if (!ofType.length) out.push(`This place has no ${label} rooms.`);
    else if (prefs.budget_zmw !== undefined) {
      const cheapest = Math.min(...ofType.map((r) => Number(r.price_zmw)));
      if (prefs.budget_zmw < cheapest) {
        out.push(
          `The cheapest ${label} room here is ${formatKwacha(cheapest)} ${perUnit(place.rent_unit)}. Your budget is ${formatKwacha(prefs.budget_zmw)}.`,
        );
      }
    }
  }
  return out;
}
