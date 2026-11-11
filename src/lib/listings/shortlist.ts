import type { Role } from "@/lib/auth/roles";

/**
 * Who sees the shortlist heart.
 * guest:   signed out. The heart is a link to sign in that comes back to the same page.
 * student: can save and remove.
 * hidden:  owners, administrators and technicians do not see the heart.
 */
export type HeartMode = "guest" | "student" | "hidden";

export function heartModeFor(role: Role | null | undefined): HeartMode {
  if (!role) return "guest";
  return role === "student" ? "student" : "hidden";
}

export type ShortlistResult =
  | { ok: true; saved: boolean }
  | { ok: false; signIn: string }
  | { ok: false; message: string; reference?: string };
