"use client";

import { useActionState, useState } from "react";
import { signUp } from "@/app/(public)/auth-actions";
import { IDLE } from "@/lib/form-state";
import { ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordRules } from "./PasswordRules";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, IDLE);
  const [password, setPassword] = useState("");
  const e = state.errors ?? {};
  const role = state.values?.role === "owner" ? "owner" : "student";
  return (
    <section className="card" aria-labelledby="sign-up-h" id="create-account">
      <div className="card-h">
        <h2 id="sign-up-h">Create an account</h2>
      </div>
      <form className="card-b grid" action={action} noValidate>
        {state.message ? <ErrorNotice message={state.message} reference={state.reference} /> : null}
        <fieldset aria-describedby={e.role ? "su-role-err" : undefined}>
          <legend className="legend" style={{ fontSize: ".8125rem", marginBottom: ".35rem" }}>
            I am a
          </legend>
          <div className="opts">
            <label className="opt">
              <input type="radio" name="role" value="student" defaultChecked={role === "student"} />
              <span>
                <b>Student</b>
                <small>Search and apply</small>
              </span>
            </label>
            <label className="opt">
              <input type="radio" name="role" value="owner" defaultChecked={role === "owner"} />
              <span>
                <b>Property owner</b>
                <small>List rooms</small>
              </span>
            </label>
          </div>
          <FieldError id="su-role-err" message={e.role} />
        </fieldset>
        <div className="field">
          <label htmlFor="su-name">Full name</label>
          <input
            id="su-name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            placeholder="As on your student card"
            defaultValue={state.values?.full_name}
            aria-invalid={e.full_name ? true : undefined}
            aria-describedby={e.full_name ? "su-name-err" : undefined}
          />
          <FieldError id="su-name-err" message={e.full_name} />
        </div>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            defaultValue={state.values?.email}
            aria-invalid={e.email ? true : undefined}
            aria-describedby={`su-email-hint${e.email ? " su-email-err" : ""}`}
          />
          <small className="hint" id="su-email-hint">
            Use your institution email to link university applications.
          </small>
          <FieldError id="su-email-err" message={e.email} />
        </div>
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            aria-invalid={e.password ? true : undefined}
            aria-describedby={`su-rules${e.password ? " su-password-err" : ""}`}
          />
          <PasswordRules id="su-rules" password={password} />
          <FieldError id="su-password-err" message={e.password} />
        </div>
        <SubmitButton className="btn primary block" pendingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </section>
  );
}
