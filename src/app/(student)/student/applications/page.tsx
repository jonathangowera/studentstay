import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill, RoutePill } from "@/components/applications/ApplicationBits";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { myApplications, targetsFor, type MyApplication, type Targets } from "@/server/applications";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Your applications" };

function targetName(a: Pick<MyApplication, "route" | "listing_id" | "institution_id">, t: Targets): string {
  if (a.route === "university_allocation") return (a.institution_id && t.institutions.get(a.institution_id)) || "Your institution";
  return (a.listing_id && t.listings.get(a.listing_id)?.name) || "A place that is no longer listed";
}

export default async function ApplicationsPage() {
  const session = await requireRole("student", "/student/applications");
  const supabase = await createClient();

  let apps: MyApplication[] = [];
  let targets: Targets = { listings: new Map(), institutions: new Map() };
  let errorRef: string | null = null;
  try {
    apps = await myApplications(supabase, session.userId);
    targets = await targetsFor(supabase, apps);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load applications", err).reference;
  }

  return (
    <div className="stack">
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Your applications</h1>
        <p>Newest first. Open one to see every step and what happens next.</p>
      </div>

      {errorRef ? <ErrorNotice message="We could not load your applications just now. Please try again." reference={errorRef} /> : null}

      {!errorRef && apps.length === 0 ? (
        <div className="card">
          <EmptyState as="h2" icon="file" title="You have not applied for a place yet.">
            Find a place, then apply for a university allocation or to a private owner.
          </EmptyState>
          <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
            <Link className="btn primary" href="/listings">
              Find a place
            </Link>
            <Link className="btn" href="/apply">
              Apply for a university allocation
            </Link>
          </div>
        </div>
      ) : null}

      {apps.length ? (
        <section className="card" aria-labelledby="apps-h">
          <div className="card-h">
            <h2 id="apps-h">{apps.length === 1 ? "1 application" : `${apps.length} applications`}</h2>
          </div>
          <div className="card-b">
            <div className="tbl-wrap">
              <table className="tbl apps-tbl">
                <caption className="sr-only">Your applications, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Route</th>
                    <th scope="col">Applied for</th>
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
                      <td>
                        <RoutePill route={a.route} />
                      </td>
                      <td>{targetName(a, targets)}</td>
                      <td>
                        <ApplicationStatusPill status={a.status} />
                      </td>
                      <td>
                        {a.submitted_at ? (
                          <time dateTime={a.submitted_at}>{formatDateTimeCAT(a.submitted_at)}</time>
                        ) : (
                          <span className="muted">Not submitted</span>
                        )}
                      </td>
                      <td>
                        <Link className="btn sm soft" href={`/student/applications/${a.reference}`}>
                          View<span className="sr-only"> application {a.reference}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
