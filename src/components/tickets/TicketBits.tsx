import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTimeCAT } from "@/lib/format";
import { duePill, priorityPill, ticketStatusPill, type DueState, type TicketPriority, type TicketStatus, type TicketTimelineItem } from "@/lib/tickets/labels";

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  const p = ticketStatusPill(status);
  return <StatusPill tone={p.tone} icon={p.icon} label={p.label} />;
}

export function PriorityPill({ priority }: { priority: TicketPriority }) {
  const p = priorityPill(priority);
  return <StatusPill tone={p.tone} icon={p.icon} label={p.label} />;
}

export function DuePill({ state }: { state: DueState }) {
  const p = duePill(state);
  return p ? <StatusPill tone={p.tone} icon={p.icon} label={p.label} /> : null;
}

/** Due time in Central Africa Time, or a plain "No due time". */
export function DueTime({ at }: { at: string | null }) {
  return at ? <time dateTime={at}>{formatDateTimeCAT(at)}</time> : <span className="muted">No due time</span>;
}

/** Ticket timeline: status, note and time only. */
export function TicketTimeline({ items }: { items: TicketTimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((t) => (
        <li key={t.key} className={t.current ? "tl-now" : "tl-done"} aria-current={t.current ? "step" : undefined}>
          <span className="tl-dot">
            <Icon name={t.current ? "clock" : "check"} />
          </span>
          <div>
            <b>{t.label}</b>
            {t.current ? <span className="sr-only"> (current status)</span> : null}
            {t.note ? <p>{t.note}</p> : null}
          </div>
          <time dateTime={t.at}>{formatDateTimeCAT(t.at)}</time>
        </li>
      ))}
    </ol>
  );
}
