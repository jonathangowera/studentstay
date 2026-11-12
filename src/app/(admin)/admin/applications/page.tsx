import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill, RoutePill } from "@/components/applications/ApplicationBits";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/applications/status";
import { createClient } from "@/lib/supabase/server";
import { institutionApplications, type AdminApplication } from "@/server/admin";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Applications" };

const TABS: { status: ApplicationStatus | null; label: string }[] = [
  { status: null, label: "All" },
  { status: "submitted", label: "Submitted" },
  { status: "pending_approval", label: "Waiting for approval" },
  { status: "approved", label: "Approved" },
  { status: "declined", label: "Declined" },
  { status: "no_eligible_room", label: "No eligible room" },
  { status: "profile_incomplete", label: "Profile incomplete" },
];

export default async function AdminApplications({ searchParams }: PageProps<"/admin/applications">) {
  const session = await requireRole("university_admin", "/admin/applications");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.status === sp.status) ?? TABS[0];
  const instId = session.profile.institution_id;

  let apps: AdminApplication[] = [];
  let errorRef: string | null = null;
  if (instId) {
    try {
      apps = await institutionApplications(await createClient(), instId, { status: tab.status ?? undefined });
    } catch (err) {
      unstable_rethrow(err);
      errorRef = reportError("load admin applications", err).reference;
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Applications</h1>
          <p className="sub">Applications from students of your institution, newest first.</p>
        </div>
      </div>

      <ul className="tabs-links" aria-label="Show applications">
        {TABS.map((t) => (
          <li key={t.label}>
            <Link href={t.status ? `/admin/applications?status=${t.status}` : "/admin/applications"} aria-current={t === tab ? "page" : undefined}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      {!instId ? <ErrorNotice message="Your account is not linked to an institution yet." /> : null}
      {errorRef ? <ErrorNotice message="We could not load applications just now. Please try again." reference={errorRef} /> : null}

      {instId && !errorRef ? (
        apps.length ? (
          <section className="card" aria-label={`${tab.label} applications`}>
            <div className="card-b">
              <div className="tbl-wrap">
                <table className="tbl">
                  <caption className="sr-only">{tab.label} applications</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Student</th>
                      <th scope="col">Student number</th>
                      <th scope="col">Route</th>
                      <th scope="col">Status</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => (
                      <tr key={a.id}>
                        <th scope="row">
                          <span className="ref">{a.reference}</span>
                        </th>
                        <td>{a.student?.full_name || "Student"}</td>
                        <td>
                          <div className="stack-s">
                            <span>{a.student?.student_number || "Not added"}</span>
                            {a.student?.student_number ? (
                              a.student.student_number_matched ? (
                                <StatusPill tone="ok" icon="check-c" label="Confirmed" />
                              ) : (
                                <StatusPill tone="warn" icon="clock" label="Waiting for confirmation" />
                              )
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <RoutePill route={a.route} />
                        </td>
                        <td>
                          <ApplicationStatusPill status={a.status} />
                        </td>
                        <td>{a.submitted_at ? <time dateTime={a.submitted_at}>{formatDateTimeCAT(a.submitted_at)}</time> : "Not submitted"}</td>
                        <td>
                          {a.route === "university_allocation" ? (
                            <Link className="btn sm soft" href={`/admin/allocation/${a.reference}`}>
                              {a.status === "submitted" ? "Match" : a.status === "pending_approval" ? "Review" : "Open"}
                              <span className="sr-only"> {a.reference}</span>
                            </Link>
                          ) : (
                            <span className="muted" style={{ fontSize: ".75rem" }}>
                              The owner decides
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <div className="card">
            <EmptyState as="h2" icon="file" title={tab.status ? `No applications are ${tab.label.toLowerCase()}.` : "No applications yet."}>
              Applications from students of your institution appear here.
            </EmptyState>
          </div>
        )
      ) : null}
    </div>
  );
}
