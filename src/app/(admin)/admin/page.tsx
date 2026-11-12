import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { RunAllButton, RunMatchingButton } from "@/components/allocation/RunMatching";
import { flag } from "@/components/shell/Home";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { institutionApplications, institutionName, queueCounts, type AdminApplication, type QueueCounts } from "@/server/admin";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview(props: PageProps<"/admin">) {
  const session = await requireRole("university_admin", "/admin");
  const params = await props.searchParams;
  const instId = session.profile.institution_id;

  let data: { inst: { name: string; code: string } | null; counts: QueueCounts; queue: AdminApplication[] } | null = null;
  let errorRef: string | null = null;
  if (instId) {
    try {
      const supabase = await createClient();
      const [inst, counts, submitted, waiting] = await Promise.all([
        institutionName(supabase, instId),
        queueCounts(supabase, instId),
        institutionApplications(supabase, instId, { status: "submitted", route: "university_allocation", limit: 10 }),
        institutionApplications(supabase, instId, { status: "pending_approval", route: "university_allocation", limit: 10 }),
      ]);
      const byOldest = (a: AdminApplication, b: AdminApplication) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at);
      data = { inst, counts, queue: [...waiting.sort(byOldest), ...submitted.sort(byOldest)] };
    } catch (err) {
      unstable_rethrow(err);
      errorRef = reportError("load admin overview", err).reference;
    }
  }

  const folders = data
    ? [
        { href: "/admin/applications?status=submitted", tag: "In queue", n: data.counts.toMatch, label: "Applications to match", hot: false },
        { href: "/admin/applications?status=pending_approval", tag: "Needs action", n: data.counts.toApprove, label: "Recommendations to approve", hot: data.counts.toApprove > 0 },
        { href: "/admin/applications?status=profile_incomplete", tag: "Waiting on students", n: data.counts.profileIncomplete, label: "Profile incomplete", hot: false },
        { href: "/admin/applications?status=no_eligible_room", tag: "Follow up", n: data.counts.noEligibleRoom, label: "No eligible room", hot: false },
      ]
    : [];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">
            University administrator{data?.inst ? ` · ${data.inst.name} accommodation office` : ""}. Demonstration data.
          </p>
        </div>
        <div className="actions">
          <Link className="btn primary" href="/admin/applications?status=pending_approval">
            Review recommendations
          </Link>
        </div>
      </div>

      {flag(params.password) ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}
      {!instId ? (
        <Callout tone="warn" title="Your account is not linked to an institution yet.">
          Ask the system administrator to link it. Until then you cannot see or match applications.
        </Callout>
      ) : null}
      {errorRef ? <ErrorNotice message="We could not load your work queue just now. Please try again." reference={errorRef} /> : null}

      {data ? (
        <>
          <section aria-labelledby="att-h">
            <h2 className="sec" id="att-h">
              Needs your attention
            </h2>
            <ul className="folders">
              {folders.map((f) => (
                <li key={f.href}>
                  <Link className={`folder${f.hot ? " hot" : ""}`} href={f.href}>
                    <span className="ft">
                      {f.hot ? <Icon name="alert" /> : <Icon name="clock" />}
                      {f.tag}
                    </span>
                    <span className="fn">{f.n}</span>
                    <b>{f.label}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="split w3">
            <section className="card" aria-labelledby="q-h">
              <div className="card-h">
                <div>
                  <h2 id="q-h">What needs action</h2>
                  <p className="sub">Recommendations waiting for you first, then applications to match. Oldest first.</p>
                </div>
              </div>
              <div className="card-b">
                {data.queue.length ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <caption className="sr-only">Applications that need action</caption>
                      <thead>
                        <tr>
                          <th scope="col">Application</th>
                          <th scope="col">Student</th>
                          <th scope="col">Status</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">
                            <span className="sr-only">Action</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.queue.map((a) => (
                          <tr key={a.id}>
                            <th scope="row">
                              <Link className="ref" href={`/admin/allocation/${a.reference}`}>
                                {a.reference}
                              </Link>
                            </th>
                            <td>{a.student?.full_name || "Student"}</td>
                            <td>
                              <ApplicationStatusPill status={a.status} />
                            </td>
                            <td>{a.submitted_at ? <time dateTime={a.submitted_at}>{formatDateTimeCAT(a.submitted_at)}</time> : "Not submitted"}</td>
                            <td>
                              {a.status === "submitted" ? (
                                <RunMatchingButton reference={a.reference} size="sm" />
                              ) : (
                                <Link className="btn sm soft" href={`/admin/allocation/${a.reference}`}>
                                  Review<span className="sr-only"> {a.reference}</span>
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon="check-c" title="Nothing needs action right now.">
                    New applications appear here when students submit them.
                  </EmptyState>
                )}
              </div>
            </section>
            <section className="card" aria-labelledby="all-h">
              <div className="card-h">
                <div>
                  <h2 id="all-h">Match in one go</h2>
                  <p className="sub">Runs the engine for submitted university applications, one after another.</p>
                </div>
              </div>
              <div className="card-b stack">
                <RunAllButton count={data.counts.toMatch} />
                <p className="muted" style={{ fontSize: ".8125rem" }}>
                  Each result is a recommendation. Nothing is allocated until you approve it.
                </p>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
