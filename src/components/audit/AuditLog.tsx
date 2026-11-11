import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, isRole } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";
import { AUDIT_PAGE_SIZE, actionLabel, formatCat, pageCount, pageRange, recordLabel, shortId } from "@/lib/audit";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Session } from "@/server/session";

const SCOPE_TEXT = {
  owner: "Actions you have taken.",
  university_admin: "Actions in your institution, and your own.",
  system_admin: "All actions on the platform.",
} as const;

type Scope = keyof typeof SCOPE_TEXT;

function OutcomePill({ outcome }: { outcome: string }) {
  if (outcome === "success") return <StatusPill tone="ok" label="Success" />;
  if (outcome === "denied" || outcome === "failed" || outcome === "error")
    return <StatusPill tone="bad" label={outcome.charAt(0).toUpperCase() + outcome.slice(1)} />;
  return <StatusPill tone="mute" label={outcome} />;
}

/**
 * Read-only audit table. Row-level security (policy audit_read) decides what each role sees;
 * owners are also filtered to their own actions here so the intent is clear.
 */
export async function AuditLog({ session, scope, page, basePath }: { session: Session; scope: Scope; page: number; basePath: string }) {
  const supabase = await createClient();
  const { from, to } = pageRange(page);

  let query = supabase
    .from("audit_events")
    .select("id, created_at, actor_id, actor_role, action, record_type, record_id, outcome", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (scope === "owner") query = query.eq("actor_id", session.userId);

  const { data: rows, count, error } = await query;

  const head = (
    <div className="pg-head">
      <h1>Audit log</h1>
      <p>{SCOPE_TEXT[scope]} Read only. Times are Central Africa Time.</p>
    </div>
  );

  // Asking for a page past the end returns a range error; treat it as an empty page with a way back.
  if (error && error.code !== "PGRST103") {
    const f = reportError("load audit log", error);
    return (
      <>
        {head}
        <ErrorNotice message={f.message} reference={f.reference} />
      </>
    );
  }

  const list = rows ?? [];
  const total = count ?? 0;
  const pages = pageCount(total);

  // Names only for people this viewer may see (policy prof_read). Others show their role.
  const ids = [...new Set(list.map((r) => r.actor_id).filter((id): id is string => !!id && id !== session.userId))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people, error: peopleError } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    if (peopleError) reportError("load audit names", peopleError);
    for (const p of people ?? []) if (p.full_name) names.set(p.id, p.full_name);
  }

  function who(actorId: string | null, role: string | null) {
    const roleText = isRole(role) ? ROLE_LABEL[role] : "Unknown role";
    if (!actorId) return { name: "System", detail: "Automatic" };
    if (actorId === session.userId) return { name: "You", detail: roleText };
    return { name: names.get(actorId) ?? roleText, detail: names.has(actorId) ? roleText : `ID ${shortId(actorId)}` };
  }

  return (
    <>
      {head}
      <section className="card" aria-labelledby="audit-h">
        <div className="card-h">
          <div>
            <h2 id="audit-h">Recorded actions</h2>
            <p className="sub">
              {total === 0 ? "No entries" : `${total.toLocaleString("en-GB")} ${total === 1 ? "entry" : "entries"}`}
            </p>
          </div>
        </div>
        <div className="card-b flush">
          {list.length === 0 ? (
            <EmptyState title={page > 1 ? "No entries on this page" : "No activity yet"}>
              {page > 1 ? (
                <Link href={basePath}>Go to the first page</Link>
              ) : (
                "Changes to applications, beds, bookings, payments, repairs, listings and documents will appear here."
              )}
            </EmptyState>
          ) : (
            <div className="tbl-wrap" tabIndex={0} role="region" aria-labelledby="audit-h">
              <table className="tbl">
                <caption className="sr-only">
                  Audit log, page {page} of {pages}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Who</th>
                    <th scope="col">Action</th>
                    <th scope="col">Record</th>
                    <th scope="col">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const person = who(r.actor_id, r.actor_role);
                    return (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <time dateTime={r.created_at}>{formatCat(r.created_at)}</time>
                        </td>
                        <td>
                          {person.name}
                          <small>{person.detail}</small>
                        </td>
                        <td>{actionLabel(r.action)}</td>
                        <td>
                          {recordLabel(r.record_type)}
                          {r.record_id ? <span className="id"> {shortId(r.record_id)}</span> : null}
                        </td>
                        <td>
                          <OutcomePill outcome={r.outcome} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {total > AUDIT_PAGE_SIZE ? (
          <nav className="pager" aria-label="Audit log pages">
            {page > 1 ? (
              <Link className="btn sm" href={`${basePath}?page=${page - 1}`}>
                <Icon name="arrow-l" />
                <span>Previous</span>
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {Math.min(page, pages)} of {pages}
            </span>
            {page < pages ? (
              <Link className="btn sm" href={`${basePath}?page=${page + 1}`}>
                <span>Next</span>
                <Icon name="arrow-r" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </>
  );
}
