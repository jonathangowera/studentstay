"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../auth-actions";
import { IDLE } from "@/lib/form-state";
import { Callout } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, IDLE);
  const e = state.errors ?? {};
  return (
    <section className="card" aria-labelledby="fp-h">
      <div className="card-h">
        <div>
          <h1 id="fp-h" style={{ fontSize: "1.25rem" }}>
            Forgot password
          </h1>
          <p className="sub">We will email you a link to choose a new password.</p>
        </div>
      </div>
      <form className="card-b grid" action={action} noValidate>
        {state.status === "success" && state.message ? (
          <Callout tone="ok" title="Check your email" role="status">
            {state.message}
          </Callout>
        ) : null}
        <div className="field">
          <label htmlFor="fp-email">Email</label>
          <input
            id="fp-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            aria-invalid={e.email ? true : undefined}
            aria-describedby={e.email ? "fp-email-err" : undefined}
          />
          <FieldError id="fp-email-err" message={e.email} />
        </div>
        <SubmitButton className="btn primary block" pendingText="Sending…">
          Send reset link
        </SubmitButton>
        <Link href="/sign-in">Back to sign in</Link>
      </form>
    </section>
  );
}
