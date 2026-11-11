import type { Database } from "@/lib/database.types";
import type { Role } from "@/lib/auth/roles";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type RoomType = Database["public"]["Enums"]["room_type"];

export type FieldErrors = Partial<Record<string, string>>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

// ---------------------------------------------------------------- password

export type PasswordRule = { id: "length" | "letter" | "number"; label: string; met: boolean };

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "letter", label: "At least one letter", met: /\p{L}/u.test(password) },
    { id: "number", label: "At least one number", met: /\p{Nd}/u.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return password.length <= 72 && passwordRules(password).every((r) => r.met);
}

/** New password plus the confirm field. Used by the reset page and by Change password on the profile. */
export function parseNewPassword(form: { get(name: string): unknown }): Parsed<{ password: string }> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const confirm = typeof form.get("confirm") === "string" ? (form.get("confirm") as string) : "";
  if (!isPasswordValid(password)) {
    return { ok: false, errors: { password: "Use 8 or more characters with a letter and a number." } };
  }
  if (password !== confirm) return { ok: false, errors: { confirm: "The two passwords do not match." } };
  return { ok: true, data: { password } };
}

// ---------------------------------------------------------------- helpers

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL.test(value);
}

type FormLike = { get(name: string): unknown; getAll(name: string): unknown[] };

function text(form: FormLike, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function optional(value: string): string | null {
  return value === "" ? null : value;
}

function checkbox(form: FormLike, name: string): boolean {
  return form.get(name) === "on";
}

// ---------------------------------------------------------------- sign up and sign in

export type SignUpInput = { role: "student" | "owner"; fullName: string; email: string; password: string };

export function parseSignUp(form: FormLike): Parsed<SignUpInput> {
  const errors: FieldErrors = {};
  const role = text(form, "role");
  const fullName = text(form, "full_name");
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";

  if (role !== "student" && role !== "owner") errors.role = "Choose Student or Property owner.";
  if (fullName.length < 2) errors.full_name = "Enter your full name.";
  else if (fullName.length > 120) errors.full_name = "Use 120 characters or fewer.";
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (!isPasswordValid(password)) errors.password = "Use 8 or more characters with a letter and a number.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { role: role as "student" | "owner", fullName, email, password } };
}

export function parseSignIn(form: FormLike): Parsed<{ email: string; password: string }> {
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const errors: FieldErrors = {};
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (password === "") errors.password = "Enter your password.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { email, password } };
}

// ---------------------------------------------------------------- profile

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "Triple" },
  { value: "quad", label: "Quad" },
];

/** Facility codes used in listings and preferences (see supabase/seed/demo_data.sql). */
export const FACILITIES: { value: string; label: string }[] = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "water", label: "Running water" },
  { value: "power", label: "Backup power" },
  { value: "guard", label: "Guard on site" },
  { value: "cctv", label: "CCTV" },
  { value: "fire", label: "Fire extinguishers" },
  { value: "study", label: "Study area" },
  { value: "laundry", label: "Laundry" },
];

/**
 * Only the columns the database lets the browser write (grant update on profiles).
 * Never role, student_number_matched, id or timestamps.
 */
export const PROFILE_WRITABLE = [
  "full_name",
  "phone",
  "institution_id",
  "student_number",
  "programme",
  "study_year",
  "preferred_room_type",
  "budget_zmw",
  "preferred_facilities",
  "emergency_contact",
  "notify_sms",
  "owner_can_see_profile",
] as const satisfies readonly (keyof ProfileUpdate)[];

/** Students see every field. Other roles keep to name, phone, emergency contact and SMS updates. */
export function profileFieldsFor(role: Role): readonly (typeof PROFILE_WRITABLE)[number][] {
  if (role === "student") return PROFILE_WRITABLE;
  return ["full_name", "phone", "emergency_contact", "notify_sms"];
}

export function parseProfile(form: FormLike, role: Role): Parsed<ProfileUpdate> {
  const allowed = new Set<string>(profileFieldsFor(role));
  const errors: FieldErrors = {};
  const data: ProfileUpdate = {};

  const fullName = text(form, "full_name");
  if (fullName.length < 2) errors.full_name = "Enter your full name.";
  else if (fullName.length > 120) errors.full_name = "Use 120 characters or fewer.";
  else data.full_name = fullName;

  const phone = text(form, "phone");
  if (phone && !PHONE.test(phone)) errors.phone = "Enter a phone number like +260 97 000 0000.";
  else data.phone = optional(phone);

  const emergency = text(form, "emergency_contact");
  if (emergency.length > 160) errors.emergency_contact = "Use 160 characters or fewer.";
  else data.emergency_contact = optional(emergency);

  data.notify_sms = checkbox(form, "notify_sms");

  if (role === "student") {
    const institution = text(form, "institution_id");
    if (institution && !UUID.test(institution)) errors.institution_id = "Choose an institution from the list.";
    else data.institution_id = optional(institution);

    const studentNumber = text(form, "student_number");
    if (studentNumber.length > 40) errors.student_number = "Use 40 characters or fewer.";
    else if (studentNumber && !/^[A-Za-z0-9/-]+$/.test(studentNumber))
      errors.student_number = "Use only letters, numbers, dashes and slashes.";
    else data.student_number = optional(studentNumber);

    const programme = text(form, "programme");
    if (programme.length > 120) errors.programme = "Use 120 characters or fewer.";
    else data.programme = optional(programme);

    const year = text(form, "study_year");
    if (year === "") data.study_year = null;
    else if (!/^[1-7]$/.test(year)) errors.study_year = "Choose a year from 1 to 7.";
    else data.study_year = Number(year);

    const roomType = text(form, "preferred_room_type");
    if (roomType === "") data.preferred_room_type = null;
    else if (!ROOM_TYPES.some((r) => r.value === roomType)) errors.preferred_room_type = "Choose a room type.";
    else data.preferred_room_type = roomType as RoomType;

    const budget = text(form, "budget_zmw").replace(/[,\s]/g, "");
    if (budget === "") data.budget_zmw = null;
    else if (!/^\d{1,7}(\.\d{1,2})?$/.test(budget)) errors.budget_zmw = "Enter an amount in kwacha, like 2000.";
    else data.budget_zmw = Number(budget);

    const known = new Set(FACILITIES.map((f) => f.value));
    const facilities = form.getAll("preferred_facilities").filter((v): v is string => typeof v === "string");
    if (facilities.some((f) => !known.has(f))) errors.preferred_facilities = "Choose facilities from the list.";
    else data.preferred_facilities = [...new Set(facilities)];

    data.owner_can_see_profile = checkbox(form, "owner_can_see_profile");
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  // Belt and braces: never send a column the role may not edit.
  for (const key of Object.keys(data)) if (!allowed.has(key)) delete data[key as keyof ProfileUpdate];
  return { ok: true, data };
}

/** True when saving these values clears the administrator's confirmation (trigger profile_before_update). */
export function resetsConfirmation(
  before: { institution_id: string | null; student_number: string | null },
  after: ProfileUpdate,
): boolean {
  return (
    ("institution_id" in after && after.institution_id !== before.institution_id) ||
    ("student_number" in after && after.student_number !== before.student_number)
  );
}

// ---------------------------------------------------------------- business set-up

export function parseBusiness(form: FormLike): Parsed<{ business_name: string; contact_phone: string | null }> {
  const errors: FieldErrors = {};
  const name = text(form, "business_name");
  const phone = text(form, "contact_phone");
  if (name.length < 2) errors.business_name = "Enter your business or trading name.";
  else if (name.length > 120) errors.business_name = "Use 120 characters or fewer.";
  if (phone && !PHONE.test(phone)) errors.contact_phone = "Enter a phone number like +260 97 000 0000.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { business_name: name, contact_phone: optional(phone) } };
}
