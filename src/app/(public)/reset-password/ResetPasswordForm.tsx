"use client";

import { useActionState, useState } from "react";
import { updatePassword } from "../auth-actions";
import { IDLE } from "@/lib/form-state";
import { ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordRules } from "@/components/auth/PasswordRules";

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, IDLE);
  const [password, setPassword] = useState("");
  const e = state.errors ?? {};
  return (
    <section className="card" aria-labelledby="rp-h">
      <div className="card-h">
        <h1 id="rp-h" style={{ fontSize: "1.25rem" }}>
          Choose a new password
        </h1>
      </div>
      <form className="card-b grid" action={action} noValidate>
        {state.message ? <ErrorNotice message={state.message} reference={state.reference} /> : null}
        <div className="field">
          <label htmlFor="rp-password">New password</label>
          <input
            id="rp-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            aria-invalid={e.password ? true : undefined}
            aria-describedby={`rp-rules${e.password ? " rp-password-err" : ""}`}
          />
          <PasswordRules id="rp-rules" password={password} />
          <FieldError id="rp-password-err" message={e.password} />
        </div>
        <div className="field">
          <label htmlFor="rp-confirm">Type the new password again</label>
          <input
            id="rp-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={e.confirm ? true : undefined}
            aria-describedby={e.confirm ? "rp-confirm-err" : undefined}
          />
          <FieldError id="rp-confirm-err" message={e.confirm} />
        </div>
        <SubmitButton className="btn primary block" pendingText="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </section>
  );
}
