import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

export const ROLES: readonly Role[] = [
  "student",
  "owner",
  "university_admin",
  "technician",
  "system_admin",
] as const;

/** Each role has one home. The URL prefix is also the area only that role may enter. */
export const ROLE_HOME: Record<Role, string> = {
  student: "/student",
  owner: "/owner",
  university_admin: "/admin",
  technician: "/technician",
  system_admin: "/system",
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  owner: "Property owner",
  university_admin: "University administrator",
  technician: "Technician",
  system_admin: "System administrator",
};

/** Only these two can be chosen at sign-up. The database turns anything else into student. */
export const SIGNUP_ROLES = ["student", "owner"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** The role a path belongs to, or null for public paths. */
export function requiredRoleForPath(pathname: string): Role | null {
  for (const role of ROLES) {
    if (startsWithSegment(pathname, ROLE_HOME[role])) return role;
  }
  return null;
}

export function isProtectedPath(pathname: string): boolean {
  return requiredRoleForPath(pathname) !== null;
}

export function canAccess(role: Role, pathname: string): boolean {
  const required = requiredRoleForPath(pathname);
  return required === null || required === role;
}

/** Pages a signed-in person should not be sent back to after signing in. */
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/auth", "/no-access"];

const BASE = "http://studentstay.invalid";

/**
 * Keeps a `next` value only when it is a path inside this app.
 * Rejects absolute URLs, protocol-relative URLs (//evil.example), backslash tricks and control characters.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  // Browsers treat "\" like "/", so "/\evil.example" can become "//evil.example".
  if (next.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  return url.pathname + url.search + url.hash;
}

/** Where to send someone right after they sign in. */
export function destinationAfterSignIn(role: Role, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (safe) {
    const pathname = safe.split(/[?#]/)[0];
    const isAuthPage = AUTH_PAGES.some((p) => startsWithSegment(pathname, p));
    if (!isAuthPage && pathname !== "/" && canAccess(role, pathname)) return safe;
  }
  return ROLE_HOME[role];
}

/** The sign-in URL that returns the visitor to the page they wanted. */
export function signInUrlFor(pathWithSearch: string): string {
  const safe = safeNextPath(pathWithSearch);
  return safe && safe !== "/" ? `/sign-in?next=${encodeURIComponent(safe)}` : "/sign-in";
}
