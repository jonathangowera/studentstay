"use client";

import { useActionState, startTransition } from "react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";
import type { Role } from "@/lib/auth/roles";
import { FACILITIES, ROOM_TYPES } from "@/lib/validation";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { StudentNumberPill } from "./StudentNumberPill";

export type ProfileValues = {
  full_name: string;
  phone: string | null;
  emergency_contact: string | null;
  institution_id: string | null;
  student_number: string | null;
  student_number_matched: boolean;
  programme: string | null;
  study_year: number | null;
  preferred_room_type: string | null;
  budget_zmw: number | null;
  preferred_facilities: string[];
  notify_sms: boolean;
  owner_can_see_profile: boolean;
};

export type InstitutionOption = { id: string; name: string; pending: boolean };

const INITIAL: ProfileFormState = { status: "idle" };

function describedBy(...ids: (string | false | undefined)[]) {
  const list = ids.filter(Boolean).join(" ");
  return list || undefined;
}

export function ProfileForm({
  role,
  email,
  profile,
  institutions,
}: {
  role: Role;
  email: string | null;
  profile: ProfileValues;
  institutions: InstitutionOption[];
}) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL);
  const e = state.errors ?? {};
  const isStudent = role === "student";

  // Submit without React's automatic form reset, so typed values stay if the server rejects them.
  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    startTransition(() => action(data));
  }

  const err = (name: string) => (e[name] ? `${name}-err` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby="profile-status">
      <div className="split">
        <div className="stack">
          <section className="card" aria-labelledby="pd-h">
            <div className="card-h">
              <h2 id="pd-h">Personal details</h2>
            </div>
            <div className="card-b form-grid">
              <div className="field">
                <label htmlFor="full_name">Full name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  defaultValue={profile.full_name}
                  aria-invalid={e.full_name ? true : undefined}
                  aria-describedby={err("full_name")}
                />
                <FieldError id="full_name-err" message={e.full_name} />
              </div>
              <div className="field">
                <span>Email</span>
                <p style={{ minHeight: "2.75rem", display: "flex", alignItems: "center", fontSize: ".9375rem" }}>
                  {email ?? "Not available"}
                </p>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+260 97 000 0000"
                  defaultValue={profile.phone ?? ""}
                  aria-invalid={e.phone ? true : undefined}
                  aria-describedby={err("phone")}
                />
                <FieldError id="phone-err" message={e.phone} />
              </div>
              <div className="field">
                <label htmlFor="emergency_contact">Emergency contact</label>
                <input
                  id="emergency_contact"
                  name="emergency_contact"
                  type="text"
                  placeholder="Name and phone"
                  defaultValue={profile.emergency_contact ?? ""}
                  aria-invalid={e.emergency_contact ? true : undefined}
                  aria-describedby={err("emergency_contact")}
                />
                <FieldError id="emergency_contact-err" message={e.emergency_contact} />
              </div>
            </div>
          </section>

          {isStudent ? (
            <section className="card" aria-labelledby="in-h">
              <div className="card-h">
                <h2 id="in-h">Institution</h2>
                <StudentNumberPill number={profile.student_number} matched={profile.student_number_matched} />
              </div>
              <div className="card-b form-grid">
                <div className="field">
                  <label htmlFor="institution_id">Institution</label>
                  <select
                    id="institution_id"
                    name="institution_id"
                    defaultValue={profile.institution_id ?? ""}
                    aria-invalid={e.institution_id ? true : undefined}
                    aria-describedby={describedBy("confirm-note", err("institution_id"))}
                  >
                    <option value="">Not chosen yet</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.pending ? `${i.name} (being validated)` : i.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="institution_id-err" message={e.institution_id} />
                </div>
                <div className="field">
                  <label htmlFor="student_number">Student number</label>
                  <input
                    id="student_number"
                    name="student_number"
                    type="text"
                    autoComplete="off"
                    defaultValue={profile.student_number ?? ""}
                    aria-invalid={e.student_number ? true : undefined}
                    aria-describedby={describedBy("confirm-note", err("student_number"))}
                  />
                  <FieldError id="student_number-err" message={e.student_number} />
                </div>
                <div className="field">
                  <label htmlFor="programme">Programme</label>
                  <input
                    id="programme"
                    name="programme"
                    type="text"
                    defaultValue={profile.programme ?? ""}
                    aria-invalid={e.programme ? true : undefined}
                    aria-describedby={err("programme")}
                  />
                  <FieldError id="programme-err" message={e.programme} />
                </div>
                <div className="field">
                  <label htmlFor="study_year">Year</label>
                  <select
                    id="study_year"
                    name="study_year"
                    defaultValue={profile.study_year?.toString() ?? ""}
                    aria-invalid={e.study_year ? true : undefined}
                    aria-describedby={err("study_year")}
                  >
                    <option value="">Not chosen</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <FieldError id="study_year-err" message={e.study_year} />
                </div>
                <p className="hint full" id="confirm-note">
                  Your accommodation office confirms your student number. If you change your institution or student
                  number, it goes back to Waiting for confirmation until they confirm it again.
                </p>
              </div>
            </section>
          ) : null}

          {isStudent ? (
            <section className="card" aria-labelledby="mp-h">
              <div className="card-h">
                <div>
                  <h2 id="mp-h">Matching preferences</h2>
                  <p className="sub">Used to filter and rank rooms for you. You control what you share.</p>
                </div>
              </div>
              <div className="card-b form-grid">
                <div className="field">
                  <label htmlFor="preferred_room_type">Preferred room type</label>
                  <select
                    id="preferred_room_type"
                    name="preferred_room_type"
                    defaultValue={profile.preferred_room_type ?? ""}
                    aria-invalid={e.preferred_room_type ? true : undefined}
                    aria-describedby={err("preferred_room_type")}
                  >
                    <option value="">No preference</option>
                    {ROOM_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <FieldError id="preferred_room_type-err" message={e.preferred_room_type} />
                </div>
                <div className="field">
                  <label htmlFor="budget_zmw">Budget (kwacha per month)</label>
                  <input
                    id="budget_zmw"
                    name="budget_zmw"
                    type="text"
                    inputMode="decimal"
                    placeholder="2000"
                    defaultValue={profile.budget_zmw?.toString() ?? ""}
                    aria-invalid={e.budget_zmw ? true : undefined}
                    aria-describedby={err("budget_zmw")}
                  />
                  <FieldError id="budget_zmw-err" message={e.budget_zmw} />
                </div>
                <fieldset className="full" aria-describedby={err("preferred_facilities")}>
                  <legend className="legend" style={{ fontSize: ".8125rem", marginBottom: ".35rem" }}>
                    Facilities you want
                  </legend>
                  <div className="checks">
                    {FACILITIES.map((f) => (
                      <label className="check" key={f.value}>
                        <input
                          type="checkbox"
                          name="preferred_facilities"
                          value={f.value}
                          defaultChecked={profile.preferred_facilities.includes(f.value)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <FieldError id="preferred_facilities-err" message={e.preferred_facilities} />
                </fieldset>
              </div>
            </section>
          ) : null}
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="pv-h">
            <div className="card-h">
              <h2 id="pv-h">Privacy and updates</h2>
            </div>
            <div className="card-b">
              <div className="toggle">
                <div>
                  <label htmlFor="notify_sms">
                    <b>Send my updates by SMS</b>
                  </label>
                  <p id="notify_sms-hint">Messages are optional. Email and in-app updates stay on.</p>
                </div>
                <input
                  id="notify_sms"
                  name="notify_sms"
                  type="checkbox"
                  role="switch"
                  defaultChecked={profile.notify_sms}
                  aria-describedby="notify_sms-hint"
                />
              </div>
              {isStudent ? (
                <div className="toggle">
                  <div>
                    <label htmlFor="owner_can_see_profile">
                      <b>Let owners see my profile after I apply</b>
                    </label>
                    <p id="owner_can_see_profile-hint">Only to owners of the places you apply to.</p>
                  </div>
                  <input
                    id="owner_can_see_profile"
                    name="owner_can_see_profile"
                    type="checkbox"
                    role="switch"
                    defaultChecked={profile.owner_can_see_profile}
                    aria-describedby="owner_can_see_profile-hint"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="card card-b stack" aria-label="Save">
            <div id="profile-status" aria-live="polite">
              {state.status === "success" ? (
                <Callout tone={state.confirmationReset ? "warn" : "ok"} title={state.message ?? "Saved."} />
              ) : null}
              {state.status === "error" && state.message ? (
                <ErrorNotice message={state.message} reference={state.reference} />
              ) : null}
            </div>
            <button className="btn primary block" type="submit" disabled={pending} aria-disabled={pending}>
              <Icon name="check" />
              <span>{pending ? "Saving…" : "Save changes"}</span>
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
