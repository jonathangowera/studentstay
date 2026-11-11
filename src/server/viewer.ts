import "server-only";

import { heartModeFor, type HeartMode } from "@/lib/listings/shortlist";
import type { Role } from "@/lib/auth/roles";
import { getSession } from "./session";

export type Viewer = { role: Role | null; heart: HeartMode; studentId: string | null };

/** Who is looking at a public page. Signed-out visitors are allowed everywhere in slice S3. */
export async function getViewer(): Promise<Viewer> {
  const session = await getSession();
  const role = session?.role ?? null;
  return { role, heart: heartModeFor(role), studentId: role === "student" ? session!.userId : null };
}
