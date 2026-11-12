import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill, Stepper } from "@/components/applications/ApplicationBits";
import { NotificationList } from "@/components/applications/NotificationList";
import { flag } from "@/components/shell/Home";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { latestOpen, nextSteps } from "@/lib/applications/dashboard";
import { ROUTE_LABEL, STATUS_LABEL, progressFor, statusExplanation } from "@/lib/applications/status";
import { createClient } from "@/lib/supabase/server";
import {
  emailVerified,
  myApplications,
  myNotifications,
  shortlistCount,
  targetsFor,
  unreadCount,
  type MyApplication,
  type Notification,
  type Targets,
} from "@/server/applications";
import { myOpenTicketCount } from "@/server/repairs";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || "there";
}

export default async function StudentDashboard(props: PageProps<"/student">) {
  const session = await requireRole("student", "/student");
  const params = await props.searchParams;
  const p = session.profile;
  const supabase = await createClient();

  let data: {
    verified: boolean;
    apps: MyApplication[];
    targets: Targets;
    saved: number;
    unread: number;
    latest: Notification[];
    institution: string | null;
    repairs: number;
  } | null = null;
  let errorRef: string | null = null;
  try {
    const [verified, apps, saved, unread, latest, inst, repairs] = await Promise.all([
      emailVerified(supabase),
      myApplications(supabase, session.userId),
      shortlistCount(supabase, session.userId),
      unreadCount(supabase, session.userId),
      myNotifications(supabase, session.userId, { limit: 5 }),
      p.institution_id
        ? supabase.from("institutions").select("name").eq("id", p.institution_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      myOpenTicketCount(supabase, session.userId),
    ]);
    if (inst.error) throw inst.error;
    data = { verified, apps, targets: await targetsFor(supabase, apps), saved, unread, latest, institution: inst.data?.name ?? null, repairs };
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load dashboard", err).reference;
  }

  const greeting = (
    <div className="greet">
      <div>
        <h1>Hello, {firstName(p.full_name)}</h1>
        <p>
          {[p.student_number ?? "Student number not added", data?.institution ?? "Institution not chosen", "Demonstration data"].join(" · ")}
        </p>
      </div>
      <Link className="btn primary" href="/listings">
        <Icon name="search" />
        <span>Find a place</span>
      </Link>
    </div>
  );

  if (!data) {
    return (
      <div className="stack">
        {greeting}
        <ErrorNotice message="We could not load your dashboard just now. Please try again." reference={errorRef} />
      </div>
    );
  }

  const { apps, targets, saved, unread, latest, verified } = data;
  const current = latestOpen(apps);
  const progress = current ? progressFor(current.status, current.route) : null;
  const steps = nextSteps({ emailVerified: verified, profile: p, apps, shortlistCount: saved, unreadCount: unread });
  const targetOf = (a: MyApplication) =>
    a.route === "university_allocation"
      ? (a.institution_id && targets.institutions.get(a.institution_id)) || "University allocation"
      : (a.listing_id && targets.listings.get(a.listing_id)?.name) || "A place that is no longer listed";

  return (
    <div className="stack">
      {greeting}
      {flag(params.password) ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-i" aria-hidden="true">
            <Icon name="file" />
          </span>
          <p className="kpi-l">Applications</p>
          <p className="kpi-v">{apps.length}</p>
          <p className="kpi-n">{current ? STATUS_LABEL[current.status] : apps.length ? "None open" : "None yet"}</p>
        </div>
        <div className="kpi">
          <span className="kpi-i" aria-hidden="true">
            <Icon name="heart" />
          </span>
          <p className="kpi-l">Shortlist</p>
          <p className="kpi-v">{saved}</p>
          <p className="kpi-n">Saved places</p>
        </div>
        <div className="kpi">
          <span className="kpi-i" aria-hidden="true">
            <Icon name="info" />
          </span>
          <p className="kpi-l">Unread updates</p>
          <p className="kpi-v">{unread}</p>
          <p className="kpi-n">{unread ? "Waiting for you" : "All caught up"}</p>
        </div>
      </div>

      <div className="split w3">
        <div className="stack">
          <section className="card" aria-labelledby="app-h">
            <div className="card-h">
              <h2 id="app-h">Your application</h2>
              {apps.length ? (
                <Link className="btn ghost sm" href="/student/applications">
                  All
                </Link>
              ) : null}
            </div>
            <div className="card-b">
              {current ? (
                <>
                  <div className="row">
                    <div>
                      <b>{targetOf(current)}</b>
                      <p className="muted" style={{ fontSize: ".8125rem" }}>
                        {ROUTE_LABEL[current.route]} · <span className="ref">{current.reference}</span>
                        {current.submitted_at ? (
                          <>
                            {" "}
                            · Submitted <time dateTime={current.submitted_at}>{formatDateTimeCAT(current.submitted_at)}</time>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="sp" />
                    <ApplicationStatusPill status={current.status} />
                  </div>
                  {progress ? <Stepper progress={progress} /> : null}
                  <p className="muted" style={{ marginTop: ".9rem" }}>
                    {statusExplanation(current.status, current.route)}
                  </p>
                  <div className="row" style={{ marginTop: ".9rem" }}>
                    <Link className="btn primary" href={`/student/applications/${current.reference}`}>
                      View application
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <EmptyState icon="file" title="You have no open application.">
                    Find a place, then apply for a university allocation or to a private owner.
                  </EmptyState>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <Link className="btn primary" href="/listings">
                      Find a place
                    </Link>
                    <Link className="btn" href="/apply">
                      Apply for a university allocation
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="rep-h">
            <div className="card-h">
              <h2 id="rep-h">Repairs</h2>
            </div>
            <div className="card-b stack-s">
              <p className="muted">
                {data.repairs
                  ? `You have ${data.repairs} open repair ${data.repairs === 1 ? "request" : "requests"}.`
                  : "You have no open repair requests."}
              </p>
              <Link className="btn sm" href="/student/repairs">
                {data.repairs ? "Follow your repairs" : "Report a repair"}
              </Link>
            </div>
          </section>
          {steps.length ? (
            <section className="card" aria-labelledby="next-h">
              <div className="card-h">
                <h2 id="next-h">Next steps</h2>
              </div>
              <div className="card-b">
                <ul className="todo-list">
                  {steps.map((s) => (
                    <li key={s.key}>
                      <Icon name={s.icon} />
                      <div>
                        <b>{s.title}</b>
                        <p>{s.text}</p>
                      </div>
                      <Link className="btn sm" href={s.href}>
                        {s.action}
                        <span className="sr-only">: {s.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section className="card" aria-labelledby="upd-h">
            <div className="card-h">
              <h2 id="upd-h">Latest updates</h2>
              <Link className="btn ghost sm" href="/student/notifications">
                All<span className="sr-only"> notifications</span>
              </Link>
            </div>
            {latest.length ? (
              <NotificationList items={latest} returnTo="/student" />
            ) : (
              <div className="card-b">
                <p className="muted">No updates yet. When something changes, it appears here.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
