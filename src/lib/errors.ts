/**
 * Turns database and Supabase Auth errors into friendly messages with a reference code.
 * Database functions raise "CODE: detail". We match on the code before the colon, never show the raw text.
 * See "Error codes" in docs/database-reference.md.
 */

export type FriendlyError = {
  /** The matched code, for logs and tests. Never shown on its own. */
  code: string;
  message: string;
  /** Short code the person can quote. The same value is written to the server log. */
  reference: string;
};

const GENERIC = "Something went wrong. Please try again.";

export const MESSAGES: Record<string, string> = {
  // Database function codes
  BED_UNAVAILABLE: "That bed was just taken. Here are other options.",
  INVALID_TRANSITION: "That change is not possible from the current status.",
  NOT_ALLOWED: "You do not have access to do that.",
  ALREADY_DECIDED: "This has already been decided.",
  NOTE_REQUIRED: "Please give a reason.",
  BED_NOT_ELIGIBLE: "Choose one of the eligible rooms.",
  BED_REQUIRED: "Choose the bed to hold.",
  EMAIL_NOT_VERIFIED: "Verify your email before applying.",
  REOPEN_WINDOW_PASSED: "This request can no longer be reopened. Please report a new one.",
  NOT_A_TECHNICIAN: "Choose a technician.",
  ALREADY_SENT: "This announcement has already been sent.",
  BED_NOT_FOUND: GENERIC,
  RUN_NOT_FOUND: GENERIC,
  TICKET_NOT_FOUND: GENERIC,
  BAD_DECISION: GENERIC,
  BAD_STATE: GENERIC,
  AUDIT_IMMUTABLE: GENERIC,

  // Postgres SQLSTATE codes
  "42501": "You do not have access to do that.",
  "23514": "Some details are not valid. Check the form and try again.",
  "23P01": "That overlaps with an existing booking.",
  "23505": "That record already exists.",
  STUDENT_NUMBER_TAKEN: "This student number cannot be used. Check it, or contact your accommodation office.",

  // Supabase Auth codes
  invalid_credentials: "Email or password is incorrect.",
  weak_password: "Choose a stronger password: 8 or more characters with a letter and a number.",
  same_password: "Choose a password that is different from your current one.",
  otp_expired: "That link has expired or was already used. Ask for a new one.",
  flow_state_expired: "That link has expired or was already used. Ask for a new one.",
  flow_state_not_found: "That link has expired or was already used. Ask for a new one.",
  bad_code_verifier: "Open the link in the same browser you used to ask for it, or ask for a new one.",
  over_email_send_rate_limit: "Too many emails were sent. Wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Wait a few minutes and try again.",
  email_address_invalid: "Enter a valid email address.",
  signup_disabled: "New accounts cannot be created right now.",
  reauthentication_needed: "Sign out, sign in again, then change your password.",
  session_not_found: "Your session has ended. Please sign in again.",
  session_expired: "Your session has ended. Please sign in again.",

  // PostgREST
  PGRST116: "We could not find that record.",
};

/** Constraint names that need a more specific message than their SQLSTATE. */
const CONSTRAINT_CODES: Record<string, string> = {
  profiles_student_number_uq: "STUDENT_NUMBER_TAKEN",
};

const PREFIX = /^([A-Z][A-Z0-9_]{2,}):/;

type ErrorLike = { code?: unknown; message?: unknown; details?: unknown };

function asErrorLike(err: unknown): ErrorLike {
  if (err && typeof err === "object") return err as ErrorLike;
  if (typeof err === "string") return { message: err };
  return {};
}

/** Finds the code to match on. Order: "CODE:" prefix, constraint name, SQLSTATE or auth code. */
export function extractErrorCode(err: unknown): string {
  const e = asErrorLike(err);
  const message = typeof e.message === "string" ? e.message.trim() : "";
  const details = typeof e.details === "string" ? e.details : "";
  const code = typeof e.code === "string" ? e.code : "";

  const prefixed = PREFIX.exec(message);
  if (prefixed) return prefixed[1];

  for (const [constraint, mapped] of Object.entries(CONSTRAINT_CODES)) {
    if (message.includes(constraint) || details.includes(constraint)) return mapped;
  }

  if (code) return code;
  return "UNKNOWN";
}

/** Reference codes avoid look-alike characters so they are easy to read out. */
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeReference(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)];
  return `REF-${out}`;
}

export function toFriendlyError(err: unknown, random?: () => number): FriendlyError {
  const code = extractErrorCode(err);
  return { code, message: MESSAGES[code] ?? GENERIC, reference: makeReference(random) };
}

/** Use on the server: maps the error and logs the raw detail next to the reference. */
export function reportError(context: string, err: unknown): FriendlyError {
  const friendly = toFriendlyError(err);
  const e = asErrorLike(err);
  console.error(`[${friendly.reference}] ${context}: ${friendly.code}`, typeof e.message === "string" ? e.message : err);
  return friendly;
}
