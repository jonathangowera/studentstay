import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT, formatKwacha } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { createClient } from "@/lib/supabase/server";
import { inbox, ownerBusinesses, ownerListings, type InboxRow } from "@/server/owner";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Private applications" };

export default async function OwnerApplications() {
  const session = await requireRole("owner", "/owner/applications");
  const supabase = await createClient();

  let rows: InboxRow[] = [];
  let names = new Map<string, string>();
  let errorRef: string | null = null;
  let hasBusiness = true;
  try {
    const businesses = await ownerBusinesses(supabase, session.userId);
    hasBusiness = businesses.length > 0;
    if (hasBusiness) {
      const [listings, apps] = await Promise.all([
        ownerListings(
          supabase,
          businesses.map((b) => b.id),
        ),
        inbox(supabase),
      ]);
      names = new Map(listings.map((l) => [l.id, l.name]));
      rows = apps;
    }
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load private applications", err).reference;
  }
  if (!hasBusiness) redirect("/owner/setup");

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Private applications</h1>
          <p className="sub">
            Requests students sent directly to your properties. University allocations are handled by the university and do not appear here.
          </p>
        </div>
      </div>

      {errorRef ? <ErrorNotice message="We could not load your applications just now. Please try again." reference={errorRef} /> : null}

      {!errorRef ? (
        <section className="card" aria-labelledby="pa-h">
          <div className="card-h">
            <div>
              <h2 id="pa-h">Private applications</h2>
              <p className="sub">Newest first. Times are Central Africa Time.</p>
            </div>
          </div>
          <div className="card-b">
            {rows.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <caption className="sr-only">Private applications to your properties</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Applicant</th>
                      <th scope="col">Property</th>
                      <th scope="col">Institution</th>
                      <th scope="col">Room request</th>
                      <th scope="col">Budget</th>
                      <th scope="col">Status</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <th scope="row">
                          <Link className="ref" href={`/owner/applications/${a.reference}`}>
                            {a.reference}
                          </Link>
                        </th>
                        <td>{a.applicant_name}</td>
                        <td>{names.get(a.listing_id) ?? "Your property"}</td>
                        <td>{a.applicant_institution ?? "Not given"}</td>
                        <td>{a.requested_room_type ? `${ROOM_TYPE_LABEL[a.requested_room_type]} room` : "Any"}</td>
                        <td>{a.budget_zmw != null ? `Up to ${formatKwacha(a.budget_zmw)} a month` : "Not given"}</td>
                        <td>
                          <ApplicationStatusPill status={a.status} />
                        </td>
                        <td>{a.submitted_at ? <time dateTime={a.submitted_at}>{formatDateTimeCAT(a.submitted_at)}</time> : "Not submitted"}</td>
                        <td>
                          <Link className="btn sm soft" href={`/owner/applications/${a.reference}`}>
                            Review<span className="sr-only"> {a.reference}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="file" title="No private applications yet.">
                When a student applies to one of your properties, the application appears here.
              </EmptyState>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
