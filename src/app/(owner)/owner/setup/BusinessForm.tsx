"use client";

import { useActionState } from "react";
import { createBusiness } from "@/app/actions/profile";
import { IDLE } from "@/lib/form-state";
import { ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function BusinessForm() {
  const [state, action] = useActionState(createBusiness, IDLE);
  const e = state.errors ?? {};
  return (
    <section className="card" aria-labelledby="biz-form-h">
      <div className="card-h">
        <h2 id="biz-form-h">Business details</h2>
      </div>
      <form className="card-b grid" action={action} noValidate>
        {state.message ? <ErrorNotice message={state.message} reference={state.reference} /> : null}
        <div className="field">
          <label htmlFor="business_name">Business or trading name</label>
          <input
            id="business_name"
            name="business_name"
            type="text"
            autoComplete="organization"
            required
            defaultValue={state.values?.business_name}
            aria-invalid={e.business_name ? true : undefined}
            aria-describedby={`business_name-hint${e.business_name ? " business_name-err" : ""}`}
          />
          <small className="hint" id="business_name-hint">
            Students see this name on your listings. Use your own name if you rent privately.
          </small>
          <FieldError id="business_name-err" message={e.business_name} />
        </div>
        <div className="field">
          <label htmlFor="contact_phone">Contact phone (optional)</label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            autoComplete="tel"
            placeholder="+260 97 000 0000"
            defaultValue={state.values?.contact_phone}
            aria-invalid={e.contact_phone ? true : undefined}
            aria-describedby={e.contact_phone ? "contact_phone-err" : undefined}
          />
          <FieldError id="contact_phone-err" message={e.contact_phone} />
        </div>
        <SubmitButton className="btn primary block" pendingText="Saving…">
          Save and continue
        </SubmitButton>
      </form>
    </section>
  );
}
