"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/(public)/auth-actions";
import { IDLE } from "@/lib/form-state";
import { ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SignInForm({ next }: { next: string | null }) {
  const [state, action] = useActionState(signIn, IDLE);
  const e = state.errors ?? {};
  return (
    <section className="card" aria-labelledby="sign-in-h">
      <div className="card-h">
        <h2 id="sign-in-h">Sign in</h2>
      </div>
      <form className="card-b grid" action={action} noValidate>
        {state.message ? <ErrorNotice message={state.message} reference={state.reference} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="field">
          <label htmlFor="si-email">Email</label>
          <input
            id="si-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            aria-invalid={e.email ? true : undefined}
            aria-describedby={e.email ? "si-email-err" : undefined}
          />
          <FieldError id="si-email-err" message={e.email} />
        </div>
        <div className="field">
          <label htmlFor="si-password">Password</label>
          <input
            id="si-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={e.password ? true : undefined}
            aria-describedby={e.password ? "si-password-err" : undefined}
          />
          <FieldError id="si-password-err" message={e.password} />
        </div>
        <div className="row">
          <span className="sp" />
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <SubmitButton className="btn primary block" pendingText="Signing in…">
          Sign in
        </SubmitButton>
        <p className="muted" style={{ fontSize: ".8125rem" }}>
          Just created an account? Open the link in your email first, then sign in.
        </p>
        <p className="muted" style={{ fontSize: ".8125rem" }}>
          University administrators, technicians and system administrators are invited by their organisation and sign
          in here too.
        </p>
      </form>
    </section>
  );
}
