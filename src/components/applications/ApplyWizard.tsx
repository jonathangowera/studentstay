"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { submitApplication, type ApplyState } from "@/app/actions/applications";
import { Callout } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatKwacha, perUnit } from "@/lib/format";
import { INTAKES, policyWarnings, type PlacePolicy } from "@/lib/applications/wizard";
import { ROUTE_LABEL, type ApplicationRoute } from "@/lib/applications/status";
import { FACILITIES, GENDERS, GENDER_LABEL, ROOM_TYPES, ROOM_TYPE_LABEL, type GenderPolicy, type RoomType } from "@/lib/listings/labels";

export type WizardPlace = PlacePolicy & { id: string; name: string; area: string | null; isHostel: boolean };

export type WizardValues = {
  institution_id: string;
  student_number: string;
  requested_room_type: RoomType | "";
  budget_zmw: string;
  gender_needed: GenderPolicy | "";
  intake: string;
  preferred_facilities: string[];
};

type Props = {
  mode: "new" | "edit";
  /** Edit mode: the application being changed. */
  reference?: string;
  /** Edit mode: the route and institution are fixed and shown read only. */
  fixedRoute?: ApplicationRoute;
  fixedInstitutionName?: string | null;
  /** The place the student came from, if any. */
  place: WizardPlace | null;
  institutions: { id: string; name: string }[];
  /** Institutions not taking university applications, for the note under the list. */
  closedInstitutionNames: string[];
  profile: { institution_id: string | null; student_number: string | null; confirmed: boolean };
  initial: WizardValues;
};

const STEPS = ["Route", "Your details", "Review"] as const;

const noop = () => () => {};

/** The first step with a field error after a server reply, or the review step. */
function errorStep(state: ApplyState): number {
  const steps = Object.keys(state.errors ?? {}).map((k) => FIELD_STEP[k] ?? 2);
  return steps.length ? Math.min(...steps) : 2;
}

/** The step that holds each field, so a server error can open the right step. */
const FIELD_STEP: Record<string, number> = {
  route: 0,
  listing_id: 0,
  institution_id: 1,
  student_number: 1,
  requested_room_type: 1,
  budget_zmw: 1,
  gender_needed: 1,
  intake: 1,
  preferred_facilities: 1,
  confirm: 2,
};

/**
 * The apply wizard: one form in three steps. Without JavaScript every step shows at once and Submit still works.
 * Every value is checked again on the server (src/app/actions/applications.ts).
 */
export function ApplyWizard(props: Props) {
  const { mode, place, institutions, profile } = props;
  const [state, action] = useActionState<ApplyState, FormData>(submitApplication, { status: "idle" });
  const privateOffered = mode === "new" && !!place && !place.isHostel;
  const [route, setRoute] = useState<ApplicationRoute>(props.fixedRoute ?? (privateOffered ? "private" : "university_allocation"));
  const [v, setV] = useState<WizardValues>(props.initial);
  const [step, setStep] = useState(0);
  // One step at a time only once JavaScript is running. False during the server render and without JavaScript.
  const stepped = useSyncExternalStore(noop, () => true, () => false);
  // A new server reply with an error opens the step that needs fixing (adjusting state while rendering).
  const [reply, setReply] = useState(state);
  if (reply !== state) {
    setReply(state);
    if (state.status === "error") setStep(errorStep(state));
  }
  const [stepError, setStepError] = useState<string | null>(null);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const e = state.errors ?? {};

  // After a server error, move focus to the heading of the step that was opened.
  useEffect(() => {
    if (state.status === "error") headings.current[errorStep(state)]?.focus();
  }, [state]);

  const set = <K extends keyof WizardValues>(k: K, value: WizardValues[K]) => setV((x) => ({ ...x, [k]: value }));
  const go = (n: number) => {
    setStepError(null);
    setStep(n);
    // Move focus to the new step's heading so screen reader and keyboard users know where they are.
    requestAnimationFrame(() => headings.current[n]?.focus());
  };

  const uni = route === "university_allocation";
  const isNewUni = uni && mode === "new";
  const instName = institutions.find((i) => i.id === v.institution_id)?.name ?? props.fixedInstitutionName ?? "Not chosen";
  const profileChange =
    isNewUni && (v.institution_id !== (profile.institution_id ?? "") || v.student_number.trim() !== (profile.student_number ?? ""));
  const budgetNumber = /^\d{1,6}$/.test(v.budget_zmw.replace(/[,\s]/g, "")) ? Number(v.budget_zmw.replace(/[,\s]/g, "")) : undefined;
  const warnings =
    route === "private" && place
      ? policyWarnings(
          {
            requested_room_type: v.requested_room_type || undefined,
            gender_needed: v.gender_needed || undefined,
            budget_zmw: budgetNumber,
          },
          place,
        )
      : [];

  /** Light checks before moving on. The server checks everything again. */
  function stepProblem(n: number): string | null {
    if (n === 1) {
      if (isNewUni && !v.institution_id) return "Choose your institution.";
      if (isNewUni && !v.student_number.trim()) return "Enter your student number.";
      if (!v.requested_room_type) return "Choose a room type.";
      if (budgetNumber === undefined || budgetNumber < 1) return "Enter your monthly budget in kwacha.";
      if (!v.gender_needed) return "Choose who can stay.";
      if (!v.intake) return "Choose an intake.";
    }
    return null;
  }

  function next() {
    const problem = stepProblem(step);
    if (problem) {
      setStepError(problem);
      return;
    }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  const hidden = (n: number) => (stepped && step !== n ? true : undefined);
  const err = (name: string) => (e[name] ? `${name}-err` : undefined);

  return (
    <div className={stepped ? "wiz stepped" : "wiz"}>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-current={stepped && i === step ? "step" : undefined}>
            <span>{i < step ? <Icon name="check" /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {state.status === "error" && state.notice ? (
        <div style={{ marginBottom: "1rem" }} role="alert">
          <Callout tone="bad" title={state.notice.message}>
            {state.notice.link ? <Link href={state.notice.link.href}>{state.notice.link.label}</Link> : null}
            {state.errorRef ? (
              <>
                {state.notice.link ? " · " : null}Reference code <span className="ref">{state.errorRef}</span>
              </>
            ) : null}
          </Callout>
        </div>
      ) : null}

      <form action={action} noValidate>
        <input type="hidden" name="mode" value={mode} />
        {props.reference ? <input type="hidden" name="reference" value={props.reference} /> : null}
        {place && route === "private" ? <input type="hidden" name="listing_id" value={place.id} /> : null}

        <section className="card">
          <div className="card-b">
            {/* Step 1: route */}
            <div className="wiz-pane" hidden={hidden(0)}>
              <h2 tabIndex={-1} ref={(el) => void (headings.current[0] = el)}>
                How do you want to apply?
              </h2>
              {mode === "edit" ? (
                <>
                  <p className="muted">The route and institution are fixed once an application is created.</p>
                  <div className="readonly-field" style={{ marginTop: ".75rem" }}>
                    {props.fixedRoute === "private" && place ? `Private application to ${place.name}` : ROUTE_LABEL[route]}
                  </div>
                  <input type="hidden" name="route" value={route} />
                  <p className="hint" style={{ marginTop: ".5rem" }}>
                    To change them, withdraw this application from its status page and start a new one.
                  </p>
                </>
              ) : (
                <>
                  <p className="muted">You can change your mind until you submit.</p>
                  <fieldset style={{ marginTop: ".9rem" }} aria-describedby={err("route")}>
                    <legend className="sr-only">Application route</legend>
                    <div className="opts">
                      <label className="opt">
                        <input
                          type="radio"
                          name="route"
                          value="university_allocation"
                          checked={route === "university_allocation"}
                          onChange={() => setRoute("university_allocation")}
                        />
                        <span>
                          <b>University allocation</b>
                          <small>
                            The system recommends a room that fits your preferences. A university administrator makes
                            the final decision.
                          </small>
                        </span>
                      </label>
                      {privateOffered && place ? (
                        <label className="opt">
                          <input type="radio" name="route" value="private" checked={route === "private"} onChange={() => setRoute("private")} />
                          <span>
                            <b>Private application to {place.name}</b>
                            <small>The owner reviews your details and accepts or declines.</small>
                          </span>
                        </label>
                      ) : (
                        <div className="opt" style={{ cursor: "default" }}>
                          <Icon name="key" />
                          <span>
                            <b>Private application</b>
                            <small>
                              {place?.isHostel
                                ? "Beds in a university hostel are allocated by the accommodation office."
                                : "Choose a place first, then apply to its owner."}{" "}
                              <Link href="/listings">Find a home</Link>
                            </small>
                          </span>
                        </div>
                      )}
                    </div>
                  </fieldset>
                  <FieldError id="route-err" message={e.route} />
                  <FieldError id="listing_id-err" message={e.listing_id} />
                </>
              )}
              <div className="callout c-info" role="note" style={{ marginTop: "1rem" }}>
                <Icon name="info" />
                <div>
                  <b>A recommendation is not a final allocation</b>
                  <p>
                    For university allocation, the system suggests rooms that fit your preferences. An administrator makes
                    the final decision, and you will see the reasons.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: details */}
            <div className="wiz-pane" hidden={hidden(1)}>
              <h2 tabIndex={-1} ref={(el) => void (headings.current[1] = el)}>
                Your details and preferences
              </h2>
              <p className="muted">
                {uni ? "These are used to filter rooms and rank the ones that fit best." : "The owner sees these with your application."}
              </p>

              {route === "private" && place ? (
                <div className="callout c-info" role="note" style={{ marginTop: ".9rem" }}>
                  <Icon name="building" />
                  <div>
                    <b>{place.name} policy</b>
                    <p>
                      {place.gender ? `${GENDER_LABEL[place.gender]}. ` : ""}
                      {place.rooms.length
                        ? ROOM_TYPES.filter((t) => place.rooms.some((r) => r.room_type === t))
                            .map((t) => {
                              const prices = place.rooms.filter((r) => r.room_type === t).map((r) => r.price_zmw);
                              return `${ROOM_TYPE_LABEL[t]} from ${formatKwacha(Math.min(...prices))}`;
                            })
                            .join(", ") + ` ${perUnit(place.rent_unit)}.`
                        : "No rooms are listed yet."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="form-grid" style={{ marginTop: "1rem" }}>
                {uni ? (
                  mode === "edit" ? (
                    <>
                      <div className="field">
                        <span>Institution</span>
                        <div className="readonly-field">{props.fixedInstitutionName ?? "Not chosen"}</div>
                      </div>
                      <div className="field">
                        <span>Student number</span>
                        <div className="readonly-field">{profile.student_number || "Not added yet"}</div>
                      </div>
                      <p className="hint full">
                        Your student number comes from your profile. <Link href="/student/profile">Change it in your profile</Link>,
                        then submit again.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="field">
                        <label htmlFor="institution_id">Institution</label>
                        <select
                          id="institution_id"
                          name="institution_id"
                          value={v.institution_id}
                          onChange={(ev) => set("institution_id", ev.target.value)}
                          aria-invalid={e.institution_id ? true : undefined}
                          aria-describedby={["inst-note", err("institution_id")].filter(Boolean).join(" ")}
                        >
                          <option value="">Choose your institution</option>
                          {institutions.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
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
                          value={v.student_number}
                          onChange={(ev) => set("student_number", ev.target.value)}
                          aria-invalid={e.student_number ? true : undefined}
                          aria-describedby={["profile-note", err("student_number")].filter(Boolean).join(" ")}
                        />
                        <FieldError id="student_number-err" message={e.student_number} />
                      </div>
                      <p className="hint full" id="inst-note">
                        Only institutions that take university allocation applications are listed.
                        {props.closedInstitutionNames.length
                          ? ` ${props.closedInstitutionNames.join(", ")} ${props.closedInstitutionNames.length === 1 ? "is" : "are"} not taking applications yet.`
                          : ""}
                      </p>
                      <p className="hint full" id="profile-note">
                        We will also save these to your profile.
                        {profile.confirmed && profileChange
                          ? " You changed them, so your accommodation office will need to confirm them again."
                          : " If you change them, your accommodation office confirms them again."}
                      </p>
                    </>
                  )
                ) : null}

                <div className="field">
                  <label htmlFor="requested_room_type">Room type</label>
                  <select
                    id="requested_room_type"
                    name="requested_room_type"
                    value={v.requested_room_type}
                    onChange={(ev) => set("requested_room_type", ev.target.value as RoomType | "")}
                    aria-invalid={e.requested_room_type ? true : undefined}
                    aria-describedby={err("requested_room_type")}
                  >
                    <option value="">Choose a room type</option>
                    {ROOM_TYPES.map((r) => (
                      <option key={r} value={r}>
                        {ROOM_TYPE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <FieldError id="requested_room_type-err" message={e.requested_room_type} />
                </div>
                <div className="field">
                  <label htmlFor="budget_zmw">Monthly budget (ZMW)</label>
                  {/* TODO(OD): hostel prices are per term and are compared as stored. The term length is an open decision. */}
                  <input
                    id="budget_zmw"
                    name="budget_zmw"
                    type="text"
                    inputMode="numeric"
                    placeholder="1500"
                    value={v.budget_zmw}
                    onChange={(ev) => set("budget_zmw", ev.target.value)}
                    aria-invalid={e.budget_zmw ? true : undefined}
                    aria-describedby={["budget-note", err("budget_zmw")].filter(Boolean).join(" ")}
                  />
                  <p className="hint" id="budget-note">
                    Whole kwacha, like 1500. Hostels are priced per term.
                  </p>
                  <FieldError id="budget_zmw-err" message={e.budget_zmw} />
                </div>
                <div className="field">
                  <label htmlFor="gender_needed">Who can stay</label>
                  <select
                    id="gender_needed"
                    name="gender_needed"
                    value={v.gender_needed}
                    onChange={(ev) => set("gender_needed", ev.target.value as GenderPolicy | "")}
                    aria-invalid={e.gender_needed ? true : undefined}
                    aria-describedby={err("gender_needed")}
                  >
                    <option value="">Choose one</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {GENDER_LABEL[g]}
                      </option>
                    ))}
                  </select>
                  <FieldError id="gender_needed-err" message={e.gender_needed} />
                </div>
                <div className="field">
                  <label htmlFor="intake">Intake</label>
                  <select
                    id="intake"
                    name="intake"
                    value={v.intake}
                    onChange={(ev) => set("intake", ev.target.value)}
                    aria-invalid={e.intake ? true : undefined}
                    aria-describedby={err("intake")}
                  >
                    <option value="">Choose an intake</option>
                    {INTAKES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <FieldError id="intake-err" message={e.intake} />
                </div>
                <fieldset className="full" aria-describedby={err("preferred_facilities")}>
                  <legend className="legend" style={{ fontSize: ".8125rem", marginBottom: ".35rem" }}>
                    Preferred facilities
                  </legend>
                  <div className="checks">
                    {FACILITIES.map((f) => (
                      <label className="check" key={f.key}>
                        <input
                          type="checkbox"
                          name="preferred_facilities"
                          value={f.key}
                          checked={v.preferred_facilities.includes(f.key)}
                          onChange={(ev) =>
                            set(
                              "preferred_facilities",
                              ev.target.checked ? [...v.preferred_facilities, f.key] : v.preferred_facilities.filter((k) => k !== f.key),
                            )
                          }
                        />
                        <Icon name={f.icon} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <FieldError id="preferred_facilities-err" message={e.preferred_facilities} />
                </fieldset>
              </div>

              {warnings.length ? (
                <div className="callout c-warn" role="status" style={{ marginTop: "1rem" }}>
                  <Icon name="alert" />
                  <div>
                    <b>Your choices do not match this place</b>
                    <ul style={{ margin: ".3rem 0 0", paddingLeft: "1.1rem" }}>
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    <p>You can still apply. The owner decides.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Step 3: review */}
            <div className="wiz-pane" hidden={hidden(2)}>
              <h2 tabIndex={-1} ref={(el) => void (headings.current[2] = el)}>
                Review and submit
              </h2>
              <dl className="summary" style={{ marginTop: ".75rem" }}>
                <div>
                  <dt>Route</dt>
                  <dd>{route === "private" && place ? `Private application to ${place.name}` : ROUTE_LABEL[route]}</dd>
                </div>
                {uni ? (
                  <div>
                    <dt>Institution</dt>
                    <dd>
                      {instName}
                      {(mode === "edit" ? profile.student_number : v.student_number.trim())
                        ? ` · ${mode === "edit" ? profile.student_number : v.student_number.trim()}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Room type</dt>
                  <dd>{v.requested_room_type ? ROOM_TYPE_LABEL[v.requested_room_type] : "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{budgetNumber !== undefined ? `${formatKwacha(budgetNumber)} per month` : "Not entered"}</dd>
                </div>
                <div>
                  <dt>Who can stay</dt>
                  <dd>{v.gender_needed ? GENDER_LABEL[v.gender_needed] : "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Intake</dt>
                  <dd>{v.intake || "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Preferred facilities</dt>
                  <dd>
                    {v.preferred_facilities.length
                      ? FACILITIES.filter((f) => v.preferred_facilities.includes(f.key))
                          .map((f) => f.label)
                          .join(", ")
                      : "None chosen"}
                  </dd>
                </div>
                {/* TODO(S7): the application fee (simulated payment) goes here. */}
                {/* TODO(S9): documents (proof of enrolment, ID) go here. */}
              </dl>
              {isNewUni && profileChange ? (
                <p className="hint" style={{ marginTop: ".75rem" }}>
                  Your institution and student number will also be saved to your profile.
                  {profile.confirmed ? " Your accommodation office will need to confirm them again." : ""}
                </p>
              ) : null}
              <label className="check" style={{ marginTop: "1rem" }}>
                <input type="checkbox" name="confirm" aria-invalid={e.confirm ? true : undefined} aria-describedby={err("confirm")} />
                <span>
                  I confirm the details are correct and I agree to the StudentStay <Link href="/help">privacy notice</Link>.
                </span>
              </label>
              <FieldError id="confirm-err" message={e.confirm} />
            </div>

            {stepError ? (
              <p className="field-error" role="alert" style={{ marginTop: "1rem" }}>
                <Icon name="alert" />
                {stepError}
              </p>
            ) : null}
          </div>
        </section>

        <div className="wiz-nav">
          {stepped && step > 0 ? (
            <button className="btn" type="button" onClick={() => go(step - 1)}>
              <Icon name="arrow-l" />
              <span>Back</span>
            </button>
          ) : (
            <span />
          )}
          {stepped && step < STEPS.length - 1 ? (
            <button className="btn primary" type="button" onClick={next}>
              <span>Continue</span>
              <Icon name="arrow-r" />
            </button>
          ) : (
            <SubmitButton pendingText="Submitting…">{mode === "edit" ? "Save and submit again" : "Submit application"}</SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
