import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT } from "@/lib/format";
import { TERM_MONTHS } from "@/lib/allocation/constants";
import { constraintSwitches } from "@/lib/allocation/labels";
import { createClient } from "@/lib/supabase/server";
import { rulesFor, type Rule } from "@/server/admin";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Allocation rules" };

export default async function AdminRules() {
  const session = await requireRole("university_admin", "/admin/rules");
  const instId = session.profile.institution_id;

  let rules: Rule[] = [];
  let errorRef: string | null = null;
  if (instId) {
    try {
      rules = await rulesFor(await createClient(), instId);
    } catch (err) {
      unstable_rethrow(err);
      errorRef = reportError("load allocation rules", err).reference;
    }
  }
  const active = rules.find((r) => r.active) ?? null;
  const weights = active
    ? [
        ["Room type", active.w_room_type],
        ["Budget fit", active.w_budget],
        ["Distance to campus", active.w_distance],
        ["Facilities", active.w_facilities],
        ["Availability confidence", active.w_availability],
      ] as const
    : [];
  const total = weights.reduce((a, [, w]) => a + w, 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Allocation rules</h1>
          <p className="sub">Rules are versioned. This page is read only. Editing rules comes in a later release.</p>
        </div>
      </div>

      {!instId ? <ErrorNotice message="Your account is not linked to an institution yet." /> : null}
      {errorRef ? <ErrorNotice message="We could not load the rules just now. Please try again." reference={errorRef} /> : null}

      {instId && !errorRef && !rules.length ? (
        <div className="card">
          <EmptyState as="h2" icon="list" title="Your institution has no allocation rule yet.">
            Matching cannot run until there is an active rule.
          </EmptyState>
        </div>
      ) : null}

      {active ? (
        <div className="split">
          <section className="card" aria-labelledby="hc-h">
            <div className="card-h">
              <div>
                <h2 id="hc-h">Hard eligibility constraints</h2>
                <p className="sub">Rooms that fail any of these are excluded, with a reason. Shown, not editable.</p>
              </div>
            </div>
            <div className="card-b">
              <ul className="rule-list">
                {constraintSwitches(active.hard_constraints).map((c) => (
                  <li key={c.key}>
                    <div>
                      <b>{c.title}</b>
                      <small>{c.text}</small>
                    </div>
                    {c.on ? <StatusPill tone="ok" icon="check-c" label="Enforced" /> : <StatusPill tone="mute" icon="pause" label="Switched off" />}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="card" aria-labelledby="w-h">
            <div className="card-h">
              <div>
                <h2 id="w-h">Preference weights</h2>
                <p className="sub">
                  {active.name}, version {active.version}. Used only to rank rooms that are already eligible.
                </p>
              </div>
            </div>
            <div className="card-b stack">
              <ul className="scores">
                {weights.map(([label, w]) => (
                  <li className="score" key={label}>
                    <span>{label}</span>
                    <span className="bar" role="img" aria-label={`${label} weight ${w} of 100`}>
                      <i style={{ width: `${w}%` }} />
                    </span>
                    <b aria-hidden="true">{w}</b>
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ fontSize: ".8125rem" }}>
                Weights total {total}. Availability confidence falls as the last update gets older: 7 days or less counts fully, 8 to 30
                days reduces it, over 30 days reduces it further.
              </p>
              <p className="muted" style={{ fontSize: ".8125rem" }}>
                Hostel prices are per term. They are converted to a monthly figure using {TERM_MONTHS} months before they are compared
                with the budget.
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {rules.length ? (
        <section className="card" aria-labelledby="v-h">
          <div className="card-h">
            <h2 id="v-h">Versions</h2>
          </div>
          <div className="card-b">
            <div className="tbl-wrap">
              <table className="tbl">
                <caption className="sr-only">Rule versions</caption>
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Name</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Weights</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">v{r.version}</th>
                      <td>{r.name}</td>
                      <td>{r.active ? <StatusPill tone="ok" icon="check-c" label="Active" /> : <StatusPill tone="mute" icon="clock" label="Not active" />}</td>
                      <td>
                        <time dateTime={r.created_at}>{formatDateTimeCAT(r.created_at)}</time>
                      </td>
                      <td>
                        {r.w_room_type} / {r.w_budget} / {r.w_distance} / {r.w_facilities} / {r.w_availability}
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
