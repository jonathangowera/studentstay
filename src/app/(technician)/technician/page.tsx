import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { flag } from "@/components/shell/Home";
import { DuePill, DueTime, PriorityPill, TicketStatusPill } from "@/components/tickets/TicketBits";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { reportError } from "@/lib/errors";
import { countBy, dueState, isOpenTicket, sortQueue, type TicketStatus } from "@/lib/tickets/labels";
import { createClient } from "@/lib/supabase/server";
import { technicianTickets, type QueueTicket } from "@/server/tickets";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "My jobs" };

const STATS: { status: TicketStatus; label: string; icon: IconName }[] = [
  { status: "assigned", label: "Assigned", icon: "user" },
  { status: "in_progress", label: "In progress", icon: "clock" },
  { status: "reopened", label: "Reopened", icon: "alert" },
  { status: "escalated", label: "Escalated", icon: "alert" },
  { status: "completed", label: "Completed", icon: "check-c" },
];

export default async function TechnicianHome(props: PageProps<"/technician">) {
  const session = await requireRole("technician", "/technician");
  const params = await props.searchParams;

  let tickets: QueueTicket[] | null = null;
  let errorRef: string | null = null;
  try {
    tickets = await technicianTickets(await createClient(), session.userId);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load technician queue", err).reference;
  }

  const now = new Date();
  const open = tickets ? sortQueue(tickets.filter((t) => isOpenTicket(t.status))) : [];
  const urgent = open.filter((t) => {
    const d = dueState(t.due_at, t.status, now);
    return d === "overdue" || d === "due_soon";
  });
  const counts = countBy(
    (tickets ?? []).map((t) => t.status),
    STATS.map((s) => s.status),
  );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>My jobs</h1>
          <p className="sub">Repair requests assigned to you, {session.profile.full_name || "technician"}. Times are Central Africa Time.</p>
        </div>
      </div>

      {flag(params.password) ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}
      {errorRef ? <ErrorNotice message="We could not load your jobs just now. Please try again." reference={errorRef} /> : null}

      {tickets ? (
        <>
          <ul className="kpis k5" aria-label="Your jobs by status">
            {STATS.map((s) => (
              <li className="kpi" key={s.status}>
                <span className="kpi-i" aria-hidden="true">
                  <Icon name={s.icon} />
                </span>
                <div className="kpi-l">{s.label}</div>
                <div className="kpi-v">{counts[s.status]}</div>
              </li>
            ))}
          </ul>

          <section className="card" aria-labelledby="due-h">
            <div className="card-h">
              <div>
                <h2 id="due-h">Due soon or overdue</h2>
                <p className="sub">Open jobs past their target time or due in the next 24 hours.</p>
              </div>
            </div>
            <div className="card-b">
              {urgent.length ? (
                <ul className="todo">
                  {urgent.map((t) => (
                    <li key={t.id}>
                      <div className="grow">
                        <b>
                          <span className="ref">{t.reference}</span> {t.title}
                        </b>
                        <small>
                          {t.location_text} · Due <DueTime at={t.due_at} />
                        </small>
                        <div className="row">
                          <DuePill state={dueState(t.due_at, t.status, now)} />
                          <PriorityPill priority={t.priority} />
                        </div>
                      </div>
                      <Link className="btn sm soft" href={`/technician/tickets/${t.reference}`}>
                        Open<span className="sr-only"> {t.reference}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nothing is due in the next 24 hours.</p>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="q-h">
            <div className="card-h">
              <div>
                <h2 id="q-h">Queue</h2>
                <p className="sub">Open jobs. High priority first, then the earliest due time.</p>
              </div>
            </div>
            <div className="card-b">
              {open.length ? (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <caption className="sr-only">Open repair requests assigned to you</caption>
                    <thead>
                      <tr>
                        <th scope="col">Reference</th>
                        <th scope="col">Location</th>
                        <th scope="col">Category</th>
                        <th scope="col">Title</th>
                        <th scope="col">Priority</th>
                        <th scope="col">Status</th>
                        <th scope="col">Due</th>
                        <th scope="col">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {open.map((t) => (
                        <tr key={t.id}>
                          <th scope="row">
                            <Link className="ref" href={`/technician/tickets/${t.reference}`}>
                              {t.reference}
                            </Link>
                          </th>
                          <td>{t.location_text}</td>
                          <td>{t.category}</td>
                          <td>{t.title}</td>
                          <td>
                            <PriorityPill priority={t.priority} />
                          </td>
                          <td>
                            <TicketStatusPill status={t.status} />
                          </td>
                          <td>
                            <DueTime at={t.due_at} />
                          </td>
                          <td>
                            <Link className="btn sm soft" href={`/technician/tickets/${t.reference}`}>
                              Open<span className="sr-only"> {t.reference}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon="check-c" title="No open jobs.">
                  Jobs appear here when an owner or administrator assigns a repair request to you.
                </EmptyState>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
