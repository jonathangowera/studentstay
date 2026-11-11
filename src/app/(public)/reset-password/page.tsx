import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { getSession } from "@/server/session";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The reset link from the email signs the person in for this one step (see /auth/confirm).
  const session = await getSession();
  return (
    <div className="wrap main">
      <div className="auth single">
        {session ? (
          <ResetPasswordForm />
        ) : (
          <section className="card card-b stack">
            <h1 style={{ fontSize: "1.25rem" }}>Choose a new password</h1>
            <Callout tone="warn" title="That link has expired or was already used." role="alert">
              Ask for a new link and open it in this browser.
            </Callout>
            <Link className="btn primary" href="/forgot-password">
              Ask for a new link
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
