import { StatusPill } from "@/components/ui/StatusPill";
import { Icon } from "@/components/ui/Icon";
import { bedsBadge, BED_STATES, facilityList, verificationBadge } from "@/lib/listings/labels";
import { formatDateTimeCAT, formatUpdated, staleNote } from "@/lib/format";

export function VerificationPill({ value }: { value: string | null }) {
  return <StatusPill {...verificationBadge(value)} />;
}

export function BedsPill({ available }: { available: number | null }) {
  return <StatusPill {...bedsBadge(available)} />;
}

/** "Updated 2 days ago", with the full Central Africa Time in the tooltip and for machines. */
export function Updated({ iso, className = "lc-upd", now }: { iso: string | null; className?: string; now?: Date }) {
  if (!iso) return null;
  return (
    <p className={className}>
      <Icon name="clock" />
      <time dateTime={iso} title={formatDateTimeCAT(iso)}>
        {formatUpdated(iso, now)}
      </time>
    </p>
  );
}

export function UpdatedPill({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <span className="pill s-mute">
      <Icon name="clock" />
      <time dateTime={iso} title={formatDateTimeCAT(iso)}>
        {formatUpdated(iso)}
      </time>
    </span>
  );
}

/** Shown when listing_cards.is_stale is true. */
export function StaleNote({ iso, isStale }: { iso: string | null; isStale: boolean | null }) {
  if (!isStale || !iso) return null;
  return (
    <p className="stale-note">
      <Icon name="alert" />
      <span>{staleNote(iso)}</span>
    </p>
  );
}

export function FacilityList({ keys, column = false }: { keys: string[] | null; column?: boolean }) {
  const list = facilityList(keys);
  if (!list.length) return <p className="muted">No facilities listed.</p>;
  return (
    <ul className={column ? "fac col" : "fac"}>
      {list.map((f) => (
        <li key={f.key}>
          <Icon name={f.icon} />
          {f.label}
        </li>
      ))}
    </ul>
  );
}

/** The six bed states, each with icon and text, and what "Held" means. */
export function BedStateLegend() {
  return (
    <div>
      <ul className="bed-legend" aria-label="Bed states">
        {BED_STATES.map((b) => (
          <li key={b.state}>
            <span className={`bed-sw ${b.cls}`}>
              <Icon name={b.icon} />
            </span>
            {b.label}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ marginTop: ".8rem", fontSize: ".8125rem" }}>
        Each bed has one status. &ldquo;Held&rdquo; means it is set aside for someone who is applying or paying, and it is
        released if they do not finish in time. A bed can never be given to two people.
      </p>
    </div>
  );
}

export function NotAGuarantee({ compact = false }: { compact?: boolean }) {
  return (
    <p className="muted" style={{ fontSize: compact ? ".75rem" : ".8125rem", display: "flex", gap: ".4rem", alignItems: "flex-start" }}>
      <Icon name="info" />
      <span>
        <b>What verified means.</b> Checks were completed on the listing details and documents. Not a guarantee. Visit
        before you pay.
      </span>
    </p>
  );
}
