"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { isUuid } from "@/lib/listings/compare";
import { requireRole } from "@/server/session";

/** Only these pages show notifications. Anything else goes back to the notifications page. */
const BACK = new Set(["/student", "/student/notifications", "/student/notifications?show=unread"]);

function back(form: FormData): string {
  const v = form.get("returnTo");
  return typeof v === "string" && BACK.has(v) ? v : "/student/notifications";
}

function withError(path: string, reference: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}error=${reference}`;
}

/** Mark one notification as read. Only read_at is writable; row-level security limits it to the recipient. */
export async function markNotificationRead(form: FormData): Promise<void> {
  const returnTo = back(form);
  const session = await requireRole("student", returnTo);
  const id = form.get("id");
  if (typeof id !== "string" || !isUuid(id)) redirect(returnTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", session.userId)
    .is("read_at", null);
  if (error) redirect(withError(returnTo, reportError("mark notification read", error).reference));
  revalidatePath("/student", "layout");
  redirect(returnTo);
}

export async function markAllNotificationsRead(form: FormData): Promise<void> {
  const returnTo = back(form);
  const session = await requireRole("student", returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", session.userId)
    .is("read_at", null);
  if (error) redirect(withError(returnTo, reportError("mark all notifications read", error).reference));
  revalidatePath("/student", "layout");
  redirect(returnTo);
}
