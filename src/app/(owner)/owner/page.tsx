import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { flag } from "@/components/shell/Home";
import { PriorityPill, TicketStatusPill } from "@/components/tickets/TicketBits";
import { BedCounts } from "@/components/ui/BedCounts";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT, formatUpdated, plural } from "@/lib/format";
import { addBedCounts, bookedBeds, emptyBedCounts } from "@/lib/listings/beds";
import { LISTING_TYPE_LABEL, moderationBadge, verificationBadge } from "@/lib/listings/labels";
import { canDecide } from "@/lib/owner/decision";
import { sortQueue } from "@/lib/tickets/labels";
import { createClient } from "@/lib/supabase/server";
import { inbox, openTicketsFor, ownerBusinesses, ownerListings, type InboxRow, type OwnerListing, type OwnerTicket } from "@/server/owner";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Overview" };

type Data = { listings: OwnerListing[]; toDecide: InboxRow[]; tickets: OwnerTicket[] };

export default async function OwnerHome(props: PageProps<"/owner">) {
  const session = await requireRole("owner", "/owner");
  const params = await props.searchParams;

  const supabase = await createClient();
  let businesses;
  try {
    businesses = await ownerBusinesses(supabase, session.userId);
  } catch (err) {
    unstable_rethrow(err);
    throw new Error(`Could not load your business (${reportError("load business", err).reference})`);
  }
  if (!businesses.length) redirect("/owner/setup");

  let data: Data | null = null;
  let errorRef: string | null = null;
  try {
    const listings = await ownerListings(
      supabase,
      businesses.map((b) => b.id),
    );
    const [applications, tickets] = await Promise.all([inbox(supabase), openTicketsFor(supabase, listings.map((l) => l.id))]);
    data = { listings, toDecide: applications.filter((a) => canDecide(a.status)), tickets };
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load owner overview", err).reference;
  }

  const all = data ? data.listings.reduce((sum, l) => addBedCounts(sum, l.beds), emptyBedCounts()) : emptyBedCounts();
  const names = new Map(data?.listings.map((l) => [l.id, l.name]));
  const waiting = data ? data.tickets.filter((t) => t.status === "pending" || t.status === "reopened" || t.status === "escalated") : [];
  const stats: { label: string; value: number; note: string; icon: IconName }[] = data
    ? [
        { label: "Properties", value: data.listings.length, note: "Listings you manage", icon: "building" },
        { label: "Free beds", value: all.available, note: "Available to students now", icon: "bed" },
        { label: "Reserved or occupied beds", value: bookedBeds(all), note: `${plural(all.held + all.pending_approval, "bed")} held or pending`, icon: "bookmark" },
        { label: "Applications to decide", value: data.toDecide.length, note: "Private applications waiting for you", icon: "file" },
        { label: "Open repair requests", value: data.tickets.length, note: `${plural(waiting.length, "request")} waiting for action`, icon: "alert" },
      ]
    : [];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">{businesses.map((b) => b.business_name).join(" and ")}. Demonstration data. Times are Central Africa Time.</p>
        </div>
        <div className="actions">
          <Link className="btn primary" href="/owner/applications">
            Private applications
          </Link>
        </div>
      </div>

      {flag(params.welcome) ? <Callout tone="ok" title="Your business is set up." role="status" /> : null}
      {flag(params.password) ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}
      {errorRef ? <ErrorNotice message="We could not load your overview just now. Please try again." reference={errorRef} /> : null}

      {data ? (
        <>
          <ul className="kpis k5" aria-label="Summary">
            {stats.map((s) => (
              <li className="kpi" key={s.label}>
                <span className="kpi-i" aria-hidden="true">
                  <Icon name={s.icon} />
                </span>
                <div className="kpi-l">{s.label}</div>
                <div className="kpi-v">{s.value}</div>
                <div className="kpi-n">{s.note}</div>
              </li>
            ))}
          </ul>

          <div className="split w3">
            <section className="card" aria-labelledby="props-h">
              <div className="card-h">
                <div>
                  <h2 id="props-h">My properties</h2>
                  <p className="sub">Beds by state. Students see how recently you updated availability.</p>
                </div>
              </div>
              <div className="card-b stack">
                {data.listings.length ? (
                  data.listings.map((l) => {
                    const v = verificationBadge(l.verification);
                    const m = moderationBadge(l.moderation);
                    return (
                      <article key={l.id} className="prop" aria-labelledby={`p-${l.id}`}>
                        <div className="prop-h">
                          <div>
                            <h3 id={`p-${l.id}`}>{l.name}</h3>
                            <p className="muted">
                              {l.area} · {LISTING_TYPE_LABEL[l.type]} · {formatUpdated(l.last_updated_at)}
                            </p>
                          </div>
                          <div className="row">
                            <StatusPill tone={m.tone} icon={m.icon} label={m.label} />
                            <StatusPill tone={v.tone} icon={v.icon} label={v.label} />
                          </div>
                        </div>
                        <BedCounts counts={l.beds} label={`Beds at ${l.name} by state`} />
                      </article>
                    );
                  })
                ) : (
                  <EmptyState icon="building" title="You have no properties yet.">
                    Properties you add appear here with their beds.
                  </EmptyState>
                )}
              </div>
            </section>

            <section className="card" aria-labelledby="na-h">
              <div className="card-h">
                <div>
                  <h2 id="na-h">Needs action</h2>
                  <p className="sub">Oldest first.</p>
                </div>
              </div>
              <div className="card-b stack">
                <h3 className="sec">Applications waiting for a decision</h3>
                {data.toDecide.length ? (
                  <ul className="todo">
                    {[...data.toDecide].reverse().slice(0, 5).map((a) => (
                      <li key={a.id}>
                        <div className="grow">
                          <b>
                            <span className="ref">{a.reference}</span> {a.applicant_name}
                          </b>
                          <small>
                            {names.get(a.listing_id) ?? "Your property"}
                            {a.submitted_at ? <> · Sent {formatDateTimeCAT(a.submitted_at)}</> : null}
                          </small>
                          <ApplicationStatusPill status={a.status} />
                        </div>
                        <Link className="btn sm soft" href={`/owner/applications/${a.reference}`}>
                          Review<span className="sr-only"> {a.reference}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No applications are waiting for you.</p>
                )}

                <h3 className="sec">Repair requests waiting</h3>
                {waiting.length ? (
                  <ul className="todo">
                    {sortQueue(waiting)
                      .slice(0, 5)
                      .map((t) => (
                        <li key={t.id}>
                          <div className="grow">
                            <b>
                              <span className="ref">{t.reference}</span> {t.title}
                            </b>
                            <small>{t.location_text}</small>
                            <div className="row">
                              <PriorityPill priority={t.priority} />
                              <TicketStatusPill status={t.status} />
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="muted">No repair requests are waiting.</p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
