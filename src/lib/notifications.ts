/**
 * Notification links. The database writes links such as /applications/APP-2026-0412 (see _notify calls in the
 * initial schema). Student pages live under /student, so those links are rewritten. Only links inside this site
 * are followed. Pure and unit tested.
 */
import { REFERENCE_PATTERN } from "@/lib/applications/rules";

export function notificationHref(link: string | null | undefined): string | null {
  const l = (link ?? "").trim();
  if (!l.startsWith("/") || l.startsWith("//") || l.includes("\\")) return null;
  const m = /^\/applications\/([^/?#]+)$/.exec(l);
  if (m) return REFERENCE_PATTERN.test(m[1]) ? `/student/applications/${m[1]}` : "/student/applications";
  return l;
}

/** Where /applications/<anything> goes: the tracker for a real reference, otherwise the list. */
export function applicationRedirect(reference: string): string {
  return REFERENCE_PATTERN.test(reference) ? `/student/applications/${reference}` : "/student/applications";
}
