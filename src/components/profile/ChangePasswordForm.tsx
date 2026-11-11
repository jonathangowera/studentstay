"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/app/actions/profile";
import { IDLE, type FormState } from "@/lib/form-state";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordRules } from "@/components/auth/PasswordRules";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [state, action] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await changePassword(prev, form);
    // React clears the confirm field after submit; clear the new-password field too so nothing lingers.
    setPassword("");
    return result;
  }, IDLE);
  const e = state.errors ?? {};

  return (
    <section className="card" aria-labelledby="cp-h">
      <div className="card-h">
        <div>
          <h2 id="cp-h">Change password</h2>
          <p className="sub">You stay signed in on this device.</p>
        </div>
      </div>
      <form className="card-b grid" action={action} noValidate>
        <div aria-live="polite">
          {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} /> : null}
          {state.status === "error" && state.message ? (
            <ErrorNotice message={state.message} reference={state.reference} />
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="cp-password">New password</label>
          <input
            id="cp-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            aria-invalid={e.password ? true : undefined}
            aria-describedby={`cp-rules${e.password ? " cp-password-err" : ""}`}
          />
          <PasswordRules id="cp-rules" password={password} />
          <FieldError id="cp-password-err" message={e.password} />
        </div>
        <div className="field">
          <label htmlFor="cp-confirm">Type the new password again</label>
          <input
            id="cp-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={e.confirm ? true : undefined}
            aria-describedby={e.confirm ? "cp-confirm-err" : undefined}
          />
          <FieldError id="cp-confirm-err" message={e.confirm} />
        </div>
        <SubmitButton className="btn" pendingText="Changing…">
          Change password
        </SubmitButton>
      </form>
    </section>
  );
}
