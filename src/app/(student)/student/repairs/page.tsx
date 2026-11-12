import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { PriorityPill, TicketStatusPill, TicketTimeline } from "@/components/tickets/TicketBits";
import { RepairForm } from "@/components/tickets/RepairForm";
import { ReopenButton } from "@/components/tickets/ReopenButton";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { ticketTimeline, type TicketEventRow } from "@/lib/tickets/labels";
import { canReopen, defaultLocation, reopenUntil } from "@/lib/tickets/validation";
import type { TransitionRow } from "@/lib/transitions";
import { createClient } from "@/lib/supabase/server";
import { eventsFor, liveBookings, myTickets, type LiveBooking, type MyTicket } from "@/server/repairs";
import { transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Repairs" };

export default async function StudentRepairs() {
  const session = await requireRole("student", "/student/repairs");
  const supabase = await createClient();

  let data: { bookings: LiveBooking[]; tickets: MyTicket[]; events: Map<string, TicketEventRow[]>; rows: TransitionRow[] } | null = null;
  let errorRef: string | null = null;
  try {
    const [bookings, tickets, rows] = await Promise.all([liveBookings(supabase, session.userId), myTickets(supabase, session.userId), transitionsFor(supabase, "ticket")]);
    data = { bookings, tickets, rows, events: await eventsFor(supabase, tickets.map((t) => t.id)) };
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load repairs", err).reference;
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Repairs</h1>
          <p className="sub">Report a problem where you live and follow it to completion. Times are Central Africa Time.</p>
        </div>
      </div>

      {errorRef ? <ErrorNotice message="We could not load your repairs just now. Please try again." reference={errorRef} /> : null}

      {data ? (
        <div className="split w3">
          <section className="card" aria-labelledby="mine-h">
            <div className="card-h">
              <h2 id="mine-h">Your repair requests</h2>
            </div>
            <div className="card-b">
              {data.tickets.length ? (
                <ul className="tickets">
                  {data.tickets.map((t) => (
                    <li key={t.id}>
                      <article aria-labelledby={`t-${t.id}`}>
                        <div className="prop-h">
                          <div>
                            <h3 id={`t-${t.id}`}>
                              <span className="ref">{t.reference}</span> {t.title}
                            </h3>
                            <p className="muted">
                              {t.category} · {t.location_text} · Sent <time dateTime={t.created_at}>{formatDateTimeCAT(t.created_at)}</time>
                            </p>
                          </div>
                          <div className="row">
                            <PriorityPill priority={t.priority} />
                            <TicketStatusPill status={t.status} />
                          </div>
                        </div>
                        <details>
                          <summary>Timeline</summary>
                          <TicketTimeline items={ticketTimeline(data.events.get(t.id) ?? [])} />
                        </details>
                        {t.completed_at && canReopen(t, data.rows) ? <ReopenButton reference={t.reference} until={formatDateTimeCAT(reopenUntil(t.completed_at))} /> : null}
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="list" title="You have not reported a repair.">
                  Requests you send appear here with their progress.
                </EmptyState>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="new-h">
            <div className="card-h">
              <div>
                <h2 id="new-h">Report a repair</h2>
                <p className="sub">The owner of your place receives it and assigns a technician.</p>
              </div>
            </div>
            <div className="card-b">
              {data.bookings.length ? (
                <RepairForm
                  bookings={data.bookings.map((b) => ({
                    bookingId: b.bookingId,
                    label: `${b.listingName}, Room ${b.roomNumber}, bed ${b.bedLabel} (${b.state === "occupied" ? "occupied" : "reserved"})`,
                    location: defaultLocation(b.listingName, b.roomNumber, b.bedLabel),
                  }))}
                />
              ) : (
                <EmptyState icon="bed" title="You can report a repair once you have a place.">
                  Repairs are for a place you have a reserved or occupied booking for. <Link href="/student/applications">See your applications</Link>.
                </EmptyState>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
