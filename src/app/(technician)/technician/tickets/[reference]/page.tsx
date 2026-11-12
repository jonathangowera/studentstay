import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { DuePill, DueTime, PriorityPill, TicketStatusPill, TicketTimeline } from "@/components/tickets/TicketBits";
import { TicketActions } from "@/components/tickets/TicketActions";
import { ErrorNotice } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { reportError } from "@/lib/errors";
import { dueState, ticketTimeline, type TicketEventRow } from "@/lib/tickets/labels";
import { isTicketReference, technicianMoves, type TransitionRow } from "@/lib/transitions";
import { createClient } from "@/lib/supabase/server";
import { ticketByReference, ticketEvents, transitionsFor, type TicketDetail } from "@/server/tickets";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Repair request" };

export default async function TechnicianTicket(props: PageProps<"/technician/tickets/[reference]">) {
  const { reference } = await props.params;
  const session = await requireRole("technician", isTicketReference(reference) ? `/technician/tickets/${reference}` : "/technician");
  if (!isTicketReference(reference)) notFound();

  const supabase = await createClient();
  let ticket: TicketDetail | null = null;
  let events: TicketEventRow[] = [];
  let transitions: TransitionRow[] = [];
  let errorRef: string | null = null;
  try {
    // Row-level security returns the ticket only when it is assigned to this technician.
    ticket = await ticketByReference(supabase, reference);
    if (ticket) [events, transitions] = await Promise.all([ticketEvents(supabase, ticket.id), transitionsFor(supabase, "ticket")]);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load ticket", err).reference;
  }
  if (!errorRef && !ticket) notFound();

  const mine = ticket?.assigned_to === session.userId;
  const moves = ticket ? technicianMoves(transitions, ticket.status, mine) : [];

  return (
    <div className="stack">
      <p>
        <Link href="/technician" className="back">
          <Icon name="arrow-l" />
          <span>My jobs</span>
        </Link>
      </p>
      <div className="page-head">
        <div>
          <h1>
            {reference}
            {ticket ? `: ${ticket.title}` : ""}
          </h1>
          <p className="sub">Times are Central Africa Time.</p>
        </div>
        {ticket ? (
          <div className="actions">
            <PriorityPill priority={ticket.priority} />
            <TicketStatusPill status={ticket.status} />
            <DuePill state={dueState(ticket.due_at, ticket.status)} />
          </div>
        ) : null}
      </div>

      {errorRef ? <ErrorNotice message="We could not load this repair request just now. Please try again." reference={errorRef} /> : null}

      {ticket ? (
        <div className="split w3">
          <div className="stack">
            <section className="card" aria-labelledby="td-h">
              <div className="card-h">
                <h2 id="td-h">Details</h2>
              </div>
              <div className="card-b">
                <dl className="facts">
                  <dt>Location</dt>
                  <dd>{ticket.location_text}</dd>
                  <dt>Category</dt>
                  <dd>{ticket.category}</dd>
                  <dt>Due</dt>
                  <dd>
                    <DueTime at={ticket.due_at} />
                  </dd>
                  <dt>Reported by</dt>
                  {/* TODO: a technician cannot read the reporter's profile under row-level security. Showing a first name needs a database function. */}
                  <dd>Reported by a tenant</dd>
                  <dt>Description</dt>
                  <dd>{ticket.description || "No description given."}</dd>
                  <dt>Access notes</dt>
                  <dd>{ticket.access_notes || "None."}</dd>
                </dl>
              </div>
            </section>
            <section className="card" aria-labelledby="tt-h">
              <div className="card-h">
                <h2 id="tt-h">Timeline</h2>
              </div>
              <div className="card-b">
                {events.length ? <TicketTimeline items={ticketTimeline(events)} /> : <p className="muted">No changes recorded yet.</p>}
              </div>
            </section>
          </div>
          <section className="card" aria-labelledby="ta-h">
            <div className="card-h">
              <div>
                <h2 id="ta-h">Update progress</h2>
                <p className="sub">The tenant is told about each change.</p>
              </div>
            </div>
            <div className="card-b">
              <TicketActions ticketId={ticket.id} reference={ticket.reference} moves={moves} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
