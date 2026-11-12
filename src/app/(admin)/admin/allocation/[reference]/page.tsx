import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { confirmStudentNumberAction } from "@/app/actions/allocation";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { ReviewBoard } from "@/components/allocation/ReviewBoard";
import { RunMatchingButton } from "@/components/allocation/RunMatching";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { formatDate, formatDateTimeCAT, formatKwacha } from "@/lib/format";
import { DECISION_PILL, groupExcluded, placeLine, type DecisionValue } from "@/lib/allocation/labels";
import { isApplicationReference } from "@/lib/applications/rules";
import { GENDER_LABEL, ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { facilityLabels } from "@/lib/allocation/engine";
import { createClient } from "@/lib/supabase/server";
import {
  applicationForReview,
  bookingForApplication,
  candidatesFor,
  ruleById,
  rulesFor,
  runsFor,
  type AdminBooking,
  type CandidateView,
  type ReviewApplication,
  type Rule,
  type RunRow,
} from "@/server/admin";
import { requireRole } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/admin/allocation/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return { title: isApplicationReference(reference) ? `Allocation review ${reference}` : "Allocation review" };
}

const REF = /^REF-[A-Z0-9]{6}$/;

export default async function AllocationReview({ params, searchParams }: PageProps<"/admin/allocation/[reference]">) {
  const { reference } = await params;
  if (!isApplicationReference(reference)) notFound();
  const session = await requireRole("university_admin", `/admin/allocation/${reference}`);
  const sp = await searchParams;
  const confirmError = typeof sp.error === "string" && REF.test(sp.error) ? sp.error : null;

  let app: ReviewApplication | null = null;
  let data: { runs: RunRow[]; candidates: CandidateView[]; rule: Rule | null; booking: AdminBooking | null } | null = null;
  let errorRef: string | null = null;
  try {
    const supabase = await createClient();
    app = await applicationForReview(supabase, reference);
    const instId = session.profile.institution_id;
    if (app && instId && app.institution_id === instId && app.route === "university_allocation") {
      const runs = await runsFor(supabase, app.id);
      const latest = runs[0];
      const [candidates, rule, booking] = await Promise.all([
        latest ? candidatesFor(supabase, latest.id) : Promise.resolve([]),
        latest?.rule ? ruleById(supabase, latest.rule.id) : rulesFor(supabase, instId).then((r) => r.find((x) => x.active) ?? null),
        app.status === "approved" ? bookingForApplication(supabase, app.id) : Promise.resolve(null),
      ]);
      data = { runs, candidates, rule, booking };
    }
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load allocation review", err).reference;
  }

  if (errorRef) {
    return (
      <div className="stack">
        <h1>Allocation review</h1>
        <ErrorNotice message="We could not load this application just now. Please try again." reference={errorRef} />
      </div>
    );
  }
  if (!app || !data) notFound();

  const { runs, candidates, rule, booking } = data;
  const latest = runs[0] ?? null;
  const ranked = candidates.filter((c) => !c.excluded).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const excluded = candidates.filter((c) => c.excluded);
  const groups = groupExcluded(excluded);
  const waiting = app.status === "pending_approval" && latest?.decision === "pending";
  const s = app.student;

  return (
    <div className="stack">
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/admin">Overview</Link>
          </li>
          <li>
            <Link href="/admin/applications">Applications</Link>
          </li>
          <li aria-current="page">{app.reference}</li>
        </ol>
      </nav>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Allocation review</h1>
          <p className="sub">
            Application <span className="ref">{app.reference}</span>
            {latest ? ` · latest run ${formatDateTimeCAT(latest.created_at)}` : ""}. A recommendation only becomes an allocation after you
            approve it.
          </p>
        </div>
        <ApplicationStatusPill status={app.status} />
      </div>

      <div className="callout c-warn" role="note">
        <Icon name="alert" />
        <div>
          <b>A recommendation is not a final allocation.</b>
          <p>It becomes one only when you approve it. Until then no bed is booked for the student.</p>
        </div>
      </div>

      <div className="split alloc">
        <div className="stack">
          {app.status === "submitted" ? (
            <section className="card" aria-labelledby="run-h">
              <div className="card-h">
                <h2 id="run-h">{latest?.decision === "rerun" ? "Sent back to match again" : "Matching has not run yet"}</h2>
              </div>
              <div className="card-b stack">
                <p className="muted">
                  {latest?.decision === "rerun"
                    ? "The last recommendation was sent back. Run matching to get a new one with the current rooms."
                    : "No rooms have been ranked for this application. Run matching to get a recommendation. You decide afterwards."}
                </p>
                <RunMatchingButton reference={app.reference} />
              </div>
            </section>
          ) : null}

          {latest && ranked.length && (waiting || app.status === "approved") ? (
            <div>
              <ReviewBoard reference={app.reference} runId={latest.id} candidates={ranked} canDecide={waiting} />
            </div>
          ) : null}

          {app.status === "approved" ? (
            <section className="card" aria-labelledby="bk-h">
              <div className="card-h">
                <h2 id="bk-h">Booking</h2>
                <StatusPill tone="ok" icon="check-c" label="Approved" />
              </div>
              <div className="card-b">
                {booking ? (
                  <dl className="summary">
                    <div>
                      <dt>Bed</dt>
                      <dd>
                        {placeLine({
                          listingName: booking.bed?.room?.listing?.name ?? "Listing",
                          wing: booking.bed?.room?.wing ?? null,
                          roomNumber: booking.bed?.room?.room_number ?? "?",
                          bedLabel: booking.bed?.label,
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>Start date</dt>
                      <dd>{formatDate(booking.start_date)}</dd>
                    </div>
                    <div>
                      <dt>End date</dt>
                      <dd>{formatDate(booking.end_date)}</dd>
                    </div>
                    <div>
                      <dt>Booking</dt>
                      <dd>{booking.state === "reserved" ? "Reserved" : booking.state.charAt(0).toUpperCase() + booking.state.slice(1)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="muted">The booking is not visible to you. It may be for a property your institution does not manage.</p>
                )}
              </div>
            </section>
          ) : null}

          {app.status === "declined" ? (
            <section className="card card-b stack" aria-labelledby="dec-h">
              <h2 id="dec-h" style={{ fontSize: "1rem" }}>
                Rejected
              </h2>
              <p>{app.status_reason || "No reason was recorded."}</p>
            </section>
          ) : null}

          {app.status === "no_eligible_room" ? (
            <section className="card" aria-labelledby="ne-h">
              <div className="card-h">
                <h2 id="ne-h">No eligible room</h2>
              </div>
              <div className="card-b stack">
                <p className="muted">No room met the hard requirements when matching ran. Rooms that failed each reason:</p>
                {groups.length ? (
                  <ul className="rule-list">
                    {groups.map((g) => (
                      <li key={g.reason}>
                        <div>{g.reason}</div>
                        <b>{g.rooms.length === 1 ? "1 room" : `${g.rooms.length} rooms`}</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>There were no rooms to consider.</p>
                )}
                {latest?.explanation ? <p className="muted" style={{ fontSize: ".8125rem" }}>{latest.explanation}</p> : null}
              </div>
            </section>
          ) : null}

          {latest && excluded.length ? (
            <section className="card excluded" aria-labelledby="ex-h">
              <div className="card-h">
                <div>
                  <h2 id="ex-h">Rooms excluded and why</h2>
                  <p className="sub">
                    {excluded.length === 1 ? "1 room" : `${excluded.length} rooms`} from the latest run. Open a reason to see the rooms.
                  </p>
                </div>
              </div>
              <div className="card-b">
                {groups.map((g) => (
                  <details key={g.reason}>
                    <summary>
                      <span>{g.reason}</span>
                      <span className="muted">{g.rooms.length === 1 ? "1 room" : `${g.rooms.length} rooms`}</span>
                    </summary>
                    <ul>
                      {g.rooms.map((r) => (
                        <li key={r.id}>
                          {placeLine(r)}: {r.exclusionReason}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="sr-h">
            <div className="card-h">
              <h2 id="sr-h">Student and rule</h2>
            </div>
            <div className="card-b stack">
              <div className="pc">
                <span className="kpi-i" style={{ position: "static" }} aria-hidden="true">
                  <Icon name="user" />
                </span>
                <div>
                  <b>{s?.full_name || "Student"}</b>
                  <small>{s?.student_number || "Student number not added"}</small>
                </div>
              </div>
              {s?.student_number ? (
                s.student_number_matched ? (
                  <StatusPill tone="ok" icon="check-c" label="Student number confirmed" />
                ) : (
                  <div className="row">
                    <StatusPill tone="warn" icon="clock" label="Waiting for confirmation" />
                    <form action={confirmStudentNumberAction}>
                      <input type="hidden" name="student_id" value={s.id} />
                      <input type="hidden" name="reference" value={app.reference} />
                      <button className="btn sm" type="submit">
                        Confirm student number
                      </button>
                    </form>
                  </div>
                )
              ) : null}
              {sp.confirmed ? <Callout tone="ok" title="Student number confirmed." role="status" /> : null}
              {confirmError ? <ErrorNotice message="We could not confirm the student number. Please try again." reference={confirmError} /> : null}
              <dl className="summary">
                <div>
                  <dt>Period</dt>
                  <dd>{app.intake || "Not given"}</dd>
                </div>
                <div>
                  <dt>Room type</dt>
                  <dd>{app.requested_room_type ? ROOM_TYPE_LABEL[app.requested_room_type] : "Not given"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{app.budget_zmw !== null ? `Up to ${formatKwacha(Math.round(app.budget_zmw))} a month` : "Not given"}</dd>
                </div>
                <div>
                  <dt>Who can stay</dt>
                  <dd>{app.gender_needed ? GENDER_LABEL[app.gender_needed] : "Not given"}</dd>
                </div>
                <div>
                  <dt>Facilities</dt>
                  <dd>{facilityLabels(app.preferred_facilities).join(", ") || "None chosen"}</dd>
                </div>
                <div>
                  <dt>Rule</dt>
                  <dd>{rule ? `${rule.name}, version ${rule.version}${rule.active ? " (active)" : ""}` : "No active rule"}</dd>
                </div>
                {rule ? (
                  <div>
                    <dt>Weights</dt>
                    <dd>
                      Room type {rule.w_room_type}, budget {rule.w_budget}, distance {rule.w_distance}, facilities {rule.w_facilities},
                      availability {rule.w_availability}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="callout c-info" role="note">
                <Icon name="info" />
                <div>
                  <b>Fields used for ranking</b>
                  <p>Room type, budget, distance, facilities, availability. Names, nationality and other personal details are never used.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="hist-h">
            <div className="card-h">
              <h2 id="hist-h">Run history</h2>
            </div>
            <div className="card-b">
              {runs.length ? (
                <ol className="timeline">
                  {runs.map((r, i) => {
                    const pill = DECISION_PILL[r.decision as DecisionValue];
                    return (
                      <li key={r.id} className={i === 0 && r.decision === "pending" ? "tl-now" : "tl-done"}>
                        <span className="tl-dot">
                          <Icon name={pill.icon} />
                        </span>
                        <div>
                          <b>
                            Recommendation generated{r.runner ? ` by ${r.runner.full_name}` : ""}
                            {r.rule ? ` (rule version ${r.rule.version})` : ""}
                          </b>
                          <p>
                            {pill.label}
                            {r.decider ? ` by ${r.decider.full_name}` : ""}
                            {r.decided_at ? `, ${formatDateTimeCAT(r.decided_at)}` : ""}
                            {r.decision_note ? `. Note: ${r.decision_note}` : ""}
                          </p>
                        </div>
                        <time dateTime={r.created_at}>{formatDateTimeCAT(r.created_at)}</time>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="muted">Matching has not run for this application yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
