import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill, ScoreBars, Timeline } from "@/components/applications/ApplicationBits";
import { WithdrawDialog } from "@/components/applications/WithdrawDialog";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { ListingImage } from "@/components/listings/ListingImage";
import { reportError } from "@/lib/errors";
import { formatDate, formatDateTimeCAT, formatKwacha, perUnit } from "@/lib/format";
import { canWithdraw, isApplicationReference } from "@/lib/applications/rules";
import { ROUTE_LABEL, isEditable, missingFromReason, statusExplanation, timelineFrom, type TimelineItem } from "@/lib/applications/status";
import { ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { createClient } from "@/lib/supabase/server";
import {
  applicationByReference,
  bookingFor,
  eventsFor,
  recommendationFor,
  targetsFor,
  withdrawTransitions,
  type BedPlace,
  type Booking,
  type MyApplication,
  type Recommendation,
  type Targets,
} from "@/server/applications";
import { requireRole } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/student/applications/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return { title: isApplicationReference(reference) ? `Application ${reference}` : "Application" };
}

function placeLine(p: BedPlace): string {
  return [p.wing, `Room ${p.roomNumber}`, p.bedLabel ? `Bed ${p.bedLabel}` : null, ROOM_TYPE_LABEL[p.roomType]].filter(Boolean).join(" · ");
}

const DONE_MESSAGES: Record<string, { tone: "ok" | "warn"; title: string; body?: string }> = {
  submitted: { tone: "ok", title: "Your application was submitted.", body: "You can follow every step on this page." },
  profile_incomplete: { tone: "warn", title: "Your application was saved, but some details are missing.", body: "See what to add below." },
  withdrawn: { tone: "ok", title: "Your application was withdrawn." },
};

export default async function ApplicationStatusPage({ params, searchParams }: PageProps<"/student/applications/[reference]">) {
  const { reference } = await params;
  if (!isApplicationReference(reference)) notFound();
  const session = await requireRole("student", `/student/applications/${reference}`);
  const sp = await searchParams;
  const done = typeof sp.done === "string" ? DONE_MESSAGES[sp.done] : undefined;
  const profileSaved = sp.profile === "saved";

  const supabase = await createClient();
  let app: MyApplication | null;
  let extra: {
    timeline: TimelineItem[];
    targets: Targets;
    withdrawable: boolean;
    recommendation: Recommendation | null;
    booking: Booking | null;
  } | null = null;
  let errorRef: string | null = null;
  try {
    app = await applicationByReference(supabase, session.userId, reference);
    if (app) {
      const a = app;
      const [events, targets, transitions, recommendation, booking] = await Promise.all([
        eventsFor(supabase, a.id),
        targetsFor(supabase, [a]),
        withdrawTransitions(supabase),
        a.route === "university_allocation" ? recommendationFor(supabase, a.id) : Promise.resolve(null),
        a.status === "approved" || a.status === "accepted" ? bookingFor(supabase, a.id) : Promise.resolve(null),
      ]);
      extra = { timeline: timelineFrom(events), targets, withdrawable: canWithdraw(a.status, transitions), recommendation, booking };
    }
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load application", err).reference;
    app = null;
  }

  if (errorRef) {
    return (
      <div className="stack">
        <h1>Application {reference}</h1>
        <ErrorNotice message="We could not load this application just now. Please try again." reference={errorRef} />
      </div>
    );
  }
  if (!app || !extra) notFound();

  const { timeline, targets, withdrawable, recommendation, booking } = extra;
  const uni = app.route === "university_allocation";
  const target = uni
    ? (app.institution_id ? targets.institutions.get(app.institution_id) : null) ?? "Your institution"
    : (app.listing_id ? targets.listings.get(app.listing_id)?.name : null) ?? "A place that is no longer listed";
  const missing = app.status === "profile_incomplete" ? missingFromReason(app.status_reason) : [];
  const acceptedAt = [...timeline].reverse().find((t) => t.status === "accepted")?.at;
  const showRecommendation = uni && recommendation && (app.status === "recommended" || app.status === "pending_approval");

  return (
    <div className="stack">
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/student">Dashboard</Link>
          </li>
          <li>
            <Link href="/student/applications">Applications</Link>
          </li>
          <li aria-current="page">{app.reference}</li>
        </ol>
      </nav>
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Application status</h1>
        <p>Every step is recorded, so you always know where your application stands.</p>
      </div>

      {done ? (
        <Callout tone={done.tone} title={done.title} role="status">
          {done.body}
          {profileSaved ? " Your institution and student number were also saved to your profile." : ""}
        </Callout>
      ) : null}

      <div className="split w3">
        <div className="stack">
          <section className="card" aria-labelledby="prog-h">
            <div className="card-h">
              <div>
                <h2 id="prog-h">Progress</h2>
                <p className="sub">
                  <span className="ref">{app.reference}</span> · {ROUTE_LABEL[app.route]} · {uni ? target : `Private application to ${target}`}
                </p>
              </div>
              <ApplicationStatusPill status={app.status} />
            </div>
            <div className="card-b stack">
              <p>{statusExplanation(app.status, app.route)}</p>
              {app.submitted_at ? (
                <p className="muted" style={{ fontSize: ".8125rem" }}>
                  Submitted <time dateTime={app.submitted_at}>{formatDateTimeCAT(app.submitted_at)}</time>
                </p>
              ) : null}
              {timeline.length ? <Timeline items={timeline} /> : <p className="muted">No steps are recorded yet.</p>}
            </div>
          </section>

          {missing.length ? (
            <section className="card" aria-labelledby="miss-h">
              <div className="card-h">
                <h2 id="miss-h">What is missing</h2>
              </div>
              <div className="card-b stack">
                <ul className="todo-list">
                  {missing.map((m) => (
                    <li key={m.label}>
                      <Icon name="alert" />
                      <div>
                        <b>{m.label}</b>
                        <p>{m.fixIn === "profile" ? "Add this in your profile." : "Add this to your application."}</p>
                      </div>
                      {m.fixIn === "profile" ? (
                        <Link className="btn sm" href="/student/profile">
                          Open profile
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Link className="btn primary" href={`/apply?application=${app.reference}`}>
                  Continue your application
                </Link>
              </div>
            </section>
          ) : app.status === "draft" ? (
            <Callout tone="info" title="This application has not been submitted yet.">
              <Link href={`/apply?application=${app.reference}`}>Continue your application</Link>
            </Callout>
          ) : null}

          {app.status === "declined" ? (
            <section className="card card-b stack" aria-labelledby="dec-h">
              <h2 id="dec-h" style={{ fontSize: "1rem" }}>
                Reason
              </h2>
              <p>{app.status_reason || "No reason was given."}</p>
            </section>
          ) : null}

          {app.status === "no_eligible_room" ? (
            <section className="card" aria-labelledby="ne-h">
              <div className="card-h">
                <h2 id="ne-h">What you can do next</h2>
              </div>
              <div className="card-b">
                <p className="muted" style={{ marginBottom: ".9rem" }}>
                  No free room met your room type, budget and the university rules when matching ran. Rooms free up during
                  the intake, and other choices may fit.
                </p>
                <ul className="todo-list">
                  <li>
                    <Icon name="filter" />
                    <div>
                      <b>Change your preferences</b>
                      <p>Try another room type or a different budget in a new application.</p>
                    </div>
                    <Link className="btn sm" href="/apply">
                      Start again
                    </Link>
                  </li>
                  <li>
                    <Icon name="key" />
                    <div>
                      <b>Browse private rentals</b>
                      <p>Apply directly to an owner near your campus.</p>
                    </div>
                    <Link className="btn sm" href="/listings?type=recognised_boarding_house&type=private_rental">
                      Browse
                    </Link>
                  </li>
                </ul>
              </div>
            </section>
          ) : null}

          {app.status === "accepted" ? (
            <Callout tone="ok" title="The owner accepted your application">
              {acceptedAt
                ? `A bed is held for you for about 48 hours from ${formatDateTimeCAT(acceptedAt)}.`
                : "A bed is held for you for about 48 hours."}{" "}
              Deposit payment opens in a later release.
            </Callout>
          ) : null}

          {app.status === "approved" ? (
            <section className="card" aria-labelledby="bk-h">
              <div className="card-h">
                <h2 id="bk-h">Your booking</h2>
              </div>
              <div className="card-b">
                {booking?.place ? (
                  <dl className="summary">
                    <div>
                      <dt>Place</dt>
                      <dd>{booking.place.listingName}</dd>
                    </div>
                    <div>
                      <dt>Room</dt>
                      <dd>{placeLine(booking.place)}</dd>
                    </div>
                    <div>
                      <dt>Start date</dt>
                      <dd>{formatDate(booking.startDate)}</dd>
                    </div>
                    <div>
                      <dt>End date</dt>
                      <dd>{formatDate(booking.endDate)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="muted">Your booking details are not available yet. Check again soon.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <div className="stack">
          {uni && showRecommendation && recommendation ? (
            <>
              <section className="card" aria-labelledby="rec-h">
                <div className="card-h">
                  <h2 id="rec-h">Recommended room</h2>
                </div>
                <div className="card-b stack">
                  {recommendation.place ? (
                    <>
                      <ListingImage id={recommendation.place.listingId} alt={`Illustration of ${recommendation.place.listingName}`} />
                      <div>
                        <h3 style={{ fontSize: "1rem" }}>{recommendation.place.listingName}</h3>
                        <p className="muted">{placeLine(recommendation.place)}</p>
                        <p style={{ marginTop: ".3rem" }}>
                          <b>{formatKwacha(recommendation.place.price)}</b>{" "}
                          <span className="muted">{perUnit(recommendation.place.rentUnit)}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="muted">The details of the recommended room are not available to you.</p>
                  )}
                </div>
              </section>
              <section className="card" aria-labelledby="why-h">
                <div className="card-h">
                  <h2 id="why-h">Why this room</h2>
                </div>
                <div className="card-b explain">
                  <Callout tone="info" title="This is a recommendation">
                    It becomes your allocation only after an administrator approves it.
                  </Callout>
                  {recommendation.scores ? <ScoreBars scores={recommendation.scores} /> : null}
                  {recommendation.explanation || recommendation.runExplanation ? (
                    <p>{recommendation.explanation ?? recommendation.runExplanation}</p>
                  ) : null}
                  <p className="muted" style={{ fontSize: ".8125rem" }}>
                    Only your room type, budget, distance and facilities preferences and room availability were used to rank
                    rooms. Your name, nationality, religion and other personal details were not used.
                  </p>
                </div>
              </section>
            </>
          ) : uni && app.status === "submitted" ? (
            <section className="card card-b stack" aria-labelledby="nr-h">
              <h2 id="nr-h" style={{ fontSize: "1rem" }}>
                Matching has not run yet
              </h2>
              <p className="muted">
                Your application is waiting to be matched with rooms. When it runs, the recommended room and the reasons will
                appear here.
              </p>
            </section>
          ) : null}

          {!uni && app.listing_id ? (
            <section className="card card-b stack" aria-labelledby="pl-h">
              <h2 id="pl-h" style={{ fontSize: "1rem" }}>
                The place
              </h2>
              <p>{target}</p>
              {targets.listings.has(app.listing_id) ? (
                <Link className="btn soft sm" href={`/listings/${app.listing_id}`}>
                  View the place
                </Link>
              ) : null}
            </section>
          ) : null}

          {withdrawable || isEditable(app.status) ? (
            <section className="card" aria-labelledby="chg-h">
              <div className="card-h">
                <h2 id="chg-h">Need to change something?</h2>
              </div>
              <div className="card-b stack">
                {isEditable(app.status) ? (
                  <Link className="btn" href={`/apply?application=${app.reference}`}>
                    Update preferences
                  </Link>
                ) : (
                  <p className="muted" style={{ fontSize: ".8125rem" }}>
                    Preferences cannot be changed after submitting. To change them, withdraw and apply again.
                  </p>
                )}
                {withdrawable ? <WithdrawDialog reference={app.reference} route={app.route} /> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
