"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { ROLE_HOME } from "@/lib/auth/roles";
import { parseBusiness, parseProfile, resetsConfirmation } from "@/lib/validation";
import { getSession, hasPartner, requireRole } from "@/server/session";

export type ProfileFormState = FormState & { confirmationReset?: boolean };

export async function updateProfile(_prev: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  // The role comes from the database, never from the form.
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = parseProfile(form, session.role);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", session.userId);
  if (error) {
    const f = reportError("update profile", error);
    return { status: "error", message: f.message, reference: f.reference };
  }

  const confirmationReset =
    session.role === "student" && session.profile.student_number_matched && resetsConfirmation(session.profile, parsed.data);

  revalidatePath(`${ROLE_HOME[session.role]}/profile`);
  return {
    status: "success",
    confirmationReset,
    message: confirmationReset
      ? "Saved. You changed your institution or student number, so it is waiting for confirmation again."
      : "Your profile is saved.",
  };
}

export async function createBusiness(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("owner", "/owner/setup");
  const values = {
    business_name: String(form.get("business_name") ?? ""),
    contact_phone: String(form.get("contact_phone") ?? ""),
  };
  const parsed = parseBusiness(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values };

  const supabase = await createClient();
  try {
    if (!(await hasPartner(supabase, session.userId))) {
      // Policy partner_insert: only an owner, only for themselves.
      const { error } = await supabase.from("partners").insert({ owner_id: session.userId, ...parsed.data });
      if (error) throw error;
    }
  } catch (err) {
    const f = reportError("create business", err);
    return { status: "error", message: f.message, reference: f.reference, values };
  }
  redirect("/owner?welcome=1");
}
