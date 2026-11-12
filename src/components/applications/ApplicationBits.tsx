import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTimeCAT } from "@/lib/format";
import { ROUTE_LABEL, statusPill, type ApplicationRoute, type ApplicationStatus, type Progress, type TimelineItem } from "@/lib/applications/status";
import type { Scores } from "@/server/applications";

/** Status is never colour alone: icon, text and colour. */
export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const p = statusPill(status);
  return <StatusPill tone={p.tone} icon={p.icon} label={p.label} />;
}

export function RoutePill({ route }: { route: ApplicationRoute }) {
  return <StatusPill tone="mute" icon={route === "university_allocation" ? "cap" : "key"} label={ROUTE_LABEL[route]} />;
}

/** The application timeline from application_events. Times in Central Africa Time. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((t) => {
        const p = statusPill(t.status);
        return (
          <li key={t.key} className={t.current ? "tl-now" : "tl-done"} aria-current={t.current ? "step" : undefined}>
            <span className="tl-dot">
              <Icon name={t.current ? p.icon : "check"} />
            </span>
            <div>
              <b>{t.label}</b>
              {t.current ? <span className="sr-only"> (current status)</span> : null}
              {t.note ? <p>{t.note}</p> : null}
            </div>
            <time dateTime={t.at}>{formatDateTimeCAT(t.at)}</time>
          </li>
        );
      })}
    </ol>
  );
}

/** The dashboard progress stepper. Each step says its state in text as well as colour. */
export function Stepper({ progress }: { progress: Progress }) {
  const word = { done: "done", now: "current step", todo: "not yet" } as const;
  return (
    <ol className="stepper" aria-label="Application progress">
      {progress.steps.map((s) => (
        <li key={s.label} className={s.state} aria-current={s.state === "now" ? "step" : undefined}>
          {s.label}
          <span className="sr-only"> ({word[s.state]})</span>
        </li>
      ))}
    </ol>
  );
}

const SCORE_ROWS: { key: keyof Omit<Scores, "total">; label: string }[] = [
  { key: "roomType", label: "Room type" },
  { key: "budget", label: "Budget" },
  { key: "distance", label: "Distance" },
  { key: "facilities", label: "Facilities" },
  { key: "availability", label: "Availability" },
];

/** Score bars for the five scoring factors, 0 to 100. Only these five are ever used to rank rooms. */
export function ScoreBars({ scores }: { scores: Scores }) {
  return (
    <ul className="scores">
      {SCORE_ROWS.map((r) => {
        const v = Math.max(0, Math.min(100, Math.round(scores[r.key])));
        return (
          <li className="score" key={r.key}>
            <span>{r.label}</span>
            <span className="bar" role="img" aria-label={`${r.label} match ${v} percent`}>
              <i style={{ width: `${v}%` }} />
            </span>
            <b aria-hidden="true">{v}</b>
          </li>
        );
      })}
    </ul>
  );
}
