"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { signInUrlFor, safeNextPath } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";
import { isUuid } from "@/lib/listings/compare";
import type { ShortlistResult } from "@/lib/listings/shortlist";
import { getSession } from "@/server/session";

/**
 * Save or remove one listing on the signed-in student's shortlist.
 * The role is checked here on the server. Row-level security also limits rows to student_id = auth.uid().
 * returnTo is the page to come back to after signing in. It is checked with safeNextPath.
 */
export async function setShortlisted(listingId: string, save: boolean, returnTo: string): Promise<ShortlistResult> {
  const back = safeNextPath(returnTo) ?? "/listings";
  if (!isUuid(listingId) || typeof save !== "boolean") {
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  const session = await getSession();
  if (!session) return { ok: false, signIn: signInUrlFor(back) };
  if (session.role !== "student") return { ok: false, message: "Only students can save places to a shortlist." };

  const supabase = await createClient();

  if (save) {
    // Only published listings can be saved.
    const { data: card, error: cardError } = await supabase.from("listing_cards").select("id").eq("id", listingId).maybeSingle();
    if (cardError) {
      const f = reportError("shortlist check listing", cardError);
      return { ok: false, message: f.message, reference: f.reference };
    }
    if (!card) return { ok: false, message: "This place is no longer listed." };

    const { error } = await supabase.from("shortlist").insert({ student_id: session.userId, listing_id: listingId });
    // 23505: already saved, for example in another tab. That is the state we wanted.
    if (error && error.code !== "23505") {
      const f = reportError("shortlist add", error);
      return { ok: false, message: f.message, reference: f.reference };
    }
  } else {
    const { error } = await supabase
      .from("shortlist")
      .delete()
      .eq("student_id", session.userId)
      .eq("listing_id", listingId);
    if (error) {
      const f = reportError("shortlist remove", error);
      return { ok: false, message: f.message, reference: f.reference };
    }
  }

  revalidatePath("/student/shortlist");
  return { ok: true, saved: save };
}

/** Form version for the remove button on /student/shortlist. Works without JavaScript. */
export async function removeFromShortlist(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("listing_id");
  const result = await setShortlisted(typeof id === "string" ? id : "", false, "/student/shortlist");
  if (result.ok) return { status: "success" };
  if ("signIn" in result) redirect(result.signIn);
  return { status: "error", message: result.message, reference: result.reference };
}
