import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { flag } from "@/components/shell/Home";
import { TicketStatusPill } from "@/components/tickets/TicketBits";
import { ApplicationStatusPill } from "@/components/applications/ApplicationBits";
import { BedCounts } from "@/components/ui/BedCounts";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { StatusPill } from "@/components/ui/StatusPill";
import { ROLES, ROLE_LABEL, isRole } from "@/lib/auth/roles";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/applications/status";
import { actionLabel, recordLabel } from "@/lib/audit";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { totalBeds } from "@/lib/listings/beds";
import { MODERATION_STATES, VERIFICATION_LABELS, moderationBadge, verificationBadge } from "@/lib/listings/labels";
import { TICKET_STATUSES } from "@/lib/tickets/labels";
import { createClient } from "@/lib/supabase/server";
import { latestAudit, systemCounts, type AuditRow, type SystemCounts } from "@/server/system";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Platform overview" };

const VERIFICATION_KEY = { "Verified listing information": "verified", "Verification pending": "pending", "Requires review": "requires_review" } as const;

function CountTable({ caption, head, rows }: { caption: string; head: string; rows: { key: string; label: React.ReactNode; n: number }[] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl small">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{head}</th>
            <th scope="col" className="num">
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              <td className="num">{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SystemHome(props: PageProps<"/system">) {
  const session = await requireRole("system_admin", "/system");
  const params = await props.searchParams;

  let counts: SystemCounts | null = null;
  let audit: AuditRow[] = [];
  let errorRef: string | null = null;
  try {
    const supabase = await createClient();
    [counts, audit] = await Promise.all([systemCounts(supabase), latestAudit(supabase, 10)]);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load platform overview", err).reference;
  }

  const who = (r: AuditRow) => {
    if (!r.actor_id) return "System";
    if (r.actor_id === session.userId) return "You";
    return r.actor_name ?? (isRole(r.actor_role) ? ROLE_LABEL[r.actor_role] : "Unknown");
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Platform overview</h1>
          <p className="sub">System administrator. Read only. Demonstration data. Times are Central Africa Time.</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/system/audit">
            Full audit log
          </Link>
        </div>
      </div>

      {flag(params.password) ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}
      {errorRef ? <ErrorNotice message="We could not load the overview just now. Please try again." reference={errorRef} /> : null}

      {counts ? (
        <>
          <section className="card" aria-labelledby="beds-h">
            <div className="card-h">
              <div>
                <h2 id="beds-h">Beds by state</h2>
                <p className="sub">{totalBeds(counts.beds)} beds on the platform.</p>
              </div>
            </div>
            <div className="card-b">
              <BedCounts counts={counts.beds} label="All beds by state" />
            </div>
          </section>

          <div className="grid3">
            <section className="card" aria-labelledby="users-h">
              <div className="card-h">
                <h2 id="users-h">Users by role</h2>
              </div>
              <div className="card-b">
                <CountTable caption="Users by role" head="Role" rows={ROLES.map((r) => ({ key: r, label: ROLE_LABEL[r], n: counts.roles[r] }))} />
              </div>
            </section>

            <section className="card" aria-labelledby="ver-h">
              <div className="card-h">
                <h2 id="ver-h">Listings by verification</h2>
              </div>
              <div className="card-b">
                <CountTable
                  caption="Listings by verification badge"
                  head="Badge"
                  rows={VERIFICATION_LABELS.map((l) => {
                    const b = verificationBadge(VERIFICATION_KEY[l]);
                    return { key: l, label: <StatusPill tone={b.tone} icon={b.icon} label={b.label} />, n: counts.verification[l] };
                  })}
                />
                <p className="hint">Not a guarantee. Badges describe checked listing information only.</p>
              </div>
            </section>

            <section className="card" aria-labelledby="mod-h">
              <div className="card-h">
                <h2 id="mod-h">Listings by moderation</h2>
              </div>
              <div className="card-b">
                <CountTable
                  caption="Listings by moderation state"
                  head="State"
                  rows={MODERATION_STATES.map((m) => {
                    const b = moderationBadge(m);
                    return { key: m, label: <StatusPill tone={b.tone} icon={b.icon} label={b.label} />, n: counts.moderation[m] };
                  })}
                />
              </div>
            </section>

            <section className="card" aria-labelledby="apps-h">
              <div className="card-h">
                <h2 id="apps-h">Applications by status</h2>
              </div>
              <div className="card-b">
                <CountTable
                  caption="Applications by status"
                  head="Status"
                  rows={(Object.keys(STATUS_LABEL) as ApplicationStatus[]).map((s) => ({
                    key: s,
                    label: <ApplicationStatusPill status={s} />,
                    n: counts.applications[s],
                  }))}
                />
              </div>
            </section>

            <section className="card" aria-labelledby="tk-h">
              <div className="card-h">
                <h2 id="tk-h">Repair requests by status</h2>
              </div>
              <div className="card-b">
                <CountTable
                  caption="Repair requests by status"
                  head="Status"
                  rows={TICKET_STATUSES.map((s) => ({ key: s, label: <TicketStatusPill status={s} />, n: counts.tickets[s] }))}
                />
              </div>
            </section>
          </div>

          <section className="card" aria-labelledby="audit-h">
            <div className="card-h">
              <div>
                <h2 id="audit-h">Latest activity</h2>
                <p className="sub">The 10 most recent audit events.</p>
              </div>
            </div>
            <div className="card-b">
              {audit.length ? (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <caption className="sr-only">The 10 most recent audit events</caption>
                    <thead>
                      <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Who</th>
                        <th scope="col">Action</th>
                        <th scope="col">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <time dateTime={r.created_at}>{formatDateTimeCAT(r.created_at)}</time>
                          </td>
                          <td>
                            {who(r)}
                            {r.actor_role && isRole(r.actor_role) ? <small>{ROLE_LABEL[r.actor_role]}</small> : null}
                          </td>
                          <td>{actionLabel(r.action)}</td>
                          <td>{recordLabel(r.record_type)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No activity recorded yet.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
