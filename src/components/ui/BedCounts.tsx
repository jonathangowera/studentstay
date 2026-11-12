import { Icon } from "@/components/ui/Icon";
import type { BedCounts as Counts } from "@/lib/listings/beds";
import { BED_STATES } from "@/lib/listings/labels";

/** Beds by state: icon, number and the state's name. Never colour alone. */
export function BedCounts({ counts, label }: { counts: Counts; label: string }) {
  return (
    <ul className="bedcounts" aria-label={label}>
      {BED_STATES.map((b) => (
        <li key={b.state} className={`bc-${b.cls}`}>
          <Icon name={b.icon} />
          <b>{counts[b.state]}</b>
          <span>{b.label}</span>
        </li>
      ))}
    </ul>
  );
}
