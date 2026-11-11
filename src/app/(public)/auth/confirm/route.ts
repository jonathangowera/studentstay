import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { safeNextPath } from "@/lib/auth/roles";
import { destinationForUser } from "@/server/session";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change", "magiclink"];

/**
 * Landing point for links in Supabase emails (confirm sign-up, reset password).
 * Accepts the token_hash form (works on any device) and the PKCE code form (same browser only).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = safeNextPath(params.get("next"));

  const supabase = await createClient();
  let userId: string | undefined;
  const isRecovery = type === "recovery" || next === "/reset-password";

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) reportError("verify email link", error);
    userId = data?.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) reportError("exchange email code", error);
    userId = data?.user?.id;
  }

  if (!userId) redirect("/sign-in?error=link");
  if (isRecovery) redirect("/reset-password");

  let destination = "/sign-in";
  try {
    destination = await destinationForUser(supabase, userId, next);
  } catch (err) {
    reportError("route after email link", err);
  }
  redirect(destination);
}
