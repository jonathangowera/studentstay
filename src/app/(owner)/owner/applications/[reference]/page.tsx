import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { DecideApplication } from "@/components/owner/DecideApplication";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT, formatKwacha, plural } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { HOLD_MESSAGE, canDecide, orderFreeBeds, type FreeBed } from "@/lib/owner/decision";
import { createClient } from "@/lib/supabase/server";
import { freeBeds, inboxRow, type InboxRow } from "@/server/owner";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Private application" };

const REFERENCE = /^APP-\d{4}-\d{4,}$/;

const OUTCOME: Partial<Record<InboxRow["status"], { tone: "ok" | "info" | "warn"; title: string; text?: string }>> = {
  accepted: { tone: "ok", title: "You accepted this application.", text: HOLD_MESSAGE },
  declined: { tone: "info", title: "You declined this application.", text: "The student was told and can see your reason." },
  withdrawn: { tone: "info", title: "The student withdrew this application.", text: "Any bed you set aside was released." },
  expired: { tone: "warn", title: "This application expired.", text: "The bed hold ran out before the deposit was paid, so the bed was released." },
};

export default async function OwnerApplication(props: PageProps<"/owner/applications/[reference]">) {
  const { reference } = await props.params;
  await requireRole("owner", REFERENCE.test(reference) ? `/owner/applications/${reference}` : "/owner/applications");
  if (!REFERENCE.test(reference)) notFound();

  const supabase = await createClient();
  let row: InboxRow | null = null;
  let listing: { name: string; rent_unit: string } | null = null;
  let beds: FreeBed[] = [];
  let errorRef: string | null = null;
  try {
    row = await inboxRow(supabase, reference);
    if (row) {
      const [l, b] = await Promise.all([
        supabase.from("listings").select("id, name, rent_unit").eq("id", row.listing_id).maybeSingle(),
        canDecide(row.status) ? freeBeds(supabase, row.listing_id) : Promise.resolve([]),
      ]);
      if (l.error) throw l.error;
      listing = l.data;
      beds = orderFreeBeds(b, row.requested_room_type);
    }
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load private application", err).reference;
  }
  if (!errorRef && !row) notFound();

  const outcome = row ? OUTCOME[row.status] : undefined;
  const matching = row ? beds.filter((b) => b.roomType === row.requested_room_type).length : 0;

  return (
    <div className="stack">
      <p>
        <Link href="/owner/applications" className="back">
          <Icon name="arrow-l" />
          <span>Private applications</span>
        </Link>
      </p>
      <div className="page-head">
        <div>
          <h1>Application {reference}</h1>
          {listing ? <p className="sub">{listing.name}. Times are Central Africa Time.</p> : null}
        </div>
        {row ? <ApplicationStatusPill status={row.status} /> : null}
      </div>

      {errorRef ? <ErrorNotice message="We could not load this application just now. Please try again." reference={errorRef} /> : null}

      {row ? (
        <div className="split w3">
          <section className="card" aria-labelledby="ad-h">
            <div className="card-h">
              <h2 id="ad-h">Details</h2>
            </div>
            <div className="card-b stack">
              <dl className="facts">
                <dt>Applicant</dt>
                <dd>{row.applicant_name}</dd>
                <dt>Institution</dt>
                <dd>{row.applicant_institution ?? "Not given"}</dd>
                <dt>Requested room type</dt>
                <dd>{row.requested_room_type ? `${ROOM_TYPE_LABEL[row.requested_room_type]} room` : "Any"}</dd>
                <dt>Budget</dt>
                <dd>{row.budget_zmw != null ? `Up to ${formatKwacha(row.budget_zmw)} a month` : "Not given"}</dd>
                <dt>Intake</dt>
                <dd>{row.intake ?? "Not given"}</dd>
                <dt>Documents</dt>
                <dd>{plural(row.document_count, "document")} uploaded</dd>
                <dt>Submitted</dt>
                <dd>{row.submitted_at ? <time dateTime={row.submitted_at}>{formatDateTimeCAT(row.submitted_at)}</time> : "Not submitted"}</dd>
              </dl>
              <Callout tone="info" title="What you can see">
                Only what you need to decide: name, institution, room request and dates. Identity documents and other applications stay private.
                {row.applicant_name === "Applicant" ? " This student chose not to share their name with owners." : ""}
              </Callout>
            </div>
          </section>

          <section className="card" aria-labelledby="dec-h">
            <div className="card-h">
              <div>
                <h2 id="dec-h">Decision</h2>
                {canDecide(row.status) ? (
                  <p className="sub">
                    {beds.length
                      ? `${plural(beds.length, "free bed")} in this property${row.requested_room_type ? `, ${matching} of the requested type` : ""}. Rechecked when you accept.`
                      : "No free bed in this property right now."}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="card-b">
              {canDecide(row.status) ? (
                <DecideApplication
                  reference={row.reference}
                  applicationId={row.id}
                  beds={beds}
                  requested={row.requested_room_type}
                  rentUnit={listing?.rent_unit ?? "month"}
                />
              ) : outcome ? (
                <Callout tone={outcome.tone} title={outcome.title}>
                  {outcome.text}
                </Callout>
              ) : (
                <p className="muted">There is nothing to decide on this application now.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
