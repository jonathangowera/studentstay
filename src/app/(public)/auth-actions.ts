"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { isValidEmail, parseNewPassword, parseSignIn, parseSignUp } from "@/lib/validation";
import { safeNextPath } from "@/lib/auth/roles";
import { destinationForUser } from "@/server/session";
import { siteOrigin } from "@/server/origin";

const SIGN_IN_FAILED = "Email or password is incorrect.";

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSignIn(form);
  const email = typeof form.get("email") === "string" ? String(form.get("email")).trim() : "";
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values: { email } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // Same words for every credential problem, so the form does not reveal which accounts exist.
    // Only an outage (no status or 5xx) gets the generic message, with a reference to look up.
    const status = (error as { status?: number } | null)?.status;
    if (!status || status >= 500) {
      const f = reportError("sign in", error);
      return { status: "error", message: f.message, reference: f.reference, values: { email } };
    }
    reportError("sign in rejected", error);
    return { status: "error", message: SIGN_IN_FAILED, values: { email } };
  }

  let destination: string;
  try {
    destination = await destinationForUser(supabase, data.user.id, safeNextPath(String(form.get("next") ?? "")));
  } catch (err) {
    const f = reportError("route after sign in", err);
    return { status: "error", message: f.message, reference: f.reference, values: { email } };
  }
  redirect(destination);
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    role: String(form.get("role") ?? "student"),
    full_name: String(form.get("full_name") ?? ""),
    email: String(form.get("email") ?? ""),
  };
  const parsed = parseSignUp(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values };

  const { role, fullName, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The database trigger reads signup_role. Only 'owner' is honoured; anything else becomes 'student'.
      data: { full_name: fullName, signup_role: role },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    const code = (error as { code?: string }).code;
    // Do not reveal that an address is already registered.
    if (code !== "user_already_exists" && code !== "email_exists") {
      const f = reportError("sign up", error);
      return { status: "error", message: f.message, reference: f.reference, values };
    }
  }

  // If email confirmation is switched off in Supabase, the person is already signed in.
  if (data?.session && data.user) redirect(await destinationForUser(supabase, data.user.id, null));
  redirect("/sign-up/check-email");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { status: "error", errors: { email: "Enter a valid email address." }, values: { email } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });
  // Log failures for us, but show the same message either way so the page does not reveal which emails exist.
  if (error) reportError("password reset request", error);
  return {
    status: "success",
    message: "If an account uses that email, we have sent a link to reset the password. Check your inbox and spam folder.",
  };
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseNewPassword(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  const { password } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return { status: "error", message: "That link has expired or was already used. Ask for a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const f = reportError("update password", error);
    return { status: "error", message: f.message, reference: f.reference };
  }
  redirect(`${await destinationForUser(supabase, userId, null)}?password=updated`);
}
