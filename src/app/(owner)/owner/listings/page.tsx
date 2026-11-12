import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ConfirmAvailability } from "@/components/owner/ConfirmAvailability";
import { BedCounts } from "@/components/ui/BedCounts";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { daysSince, formatUpdated } from "@/lib/format";
import { LISTING_TYPE_LABEL, moderationBadge, verificationBadge } from "@/lib/listings/labels";
import { createClient } from "@/lib/supabase/server";
import { ownerBusinesses, ownerListings, type OwnerListing } from "@/server/owner";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "My properties" };

export default async function OwnerListings() {
  const session = await requireRole("owner", "/owner/listings");
  const supabase = await createClient();

  let listings: OwnerListing[] | null = null;
  let hasBusiness = true;
  let errorRef: string | null = null;
  try {
    const businesses = await ownerBusinesses(supabase, session.userId);
    hasBusiness = businesses.length > 0;
    if (hasBusiness) {
      listings = await ownerListings(
        supabase,
        businesses.map((b) => b.id),
      );
    }
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load owner listings", err).reference;
  }
  if (!hasBusiness) redirect("/owner/setup");

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>My properties</h1>
          <p className="sub">Keep availability current. Students see how recently you updated it.</p>
        </div>
      </div>
      {errorRef ? <ErrorNotice message="We could not load your properties just now. Please try again." reference={errorRef} /> : null}
      {listings ? (
        listings.length ? (
          <ul className="props">
            {listings.map((l) => {
              const m = moderationBadge(l.moderation);
              const v = verificationBadge(l.verification);
              const stale = daysSince(l.last_updated_at) > 30;
              return (
                <li key={l.id}>
                  <article className="card" aria-labelledby={`l-${l.id}`}>
                    <div className="card-b stack">
                      <div className="prop-h">
                        <div>
                          <h2 id={`l-${l.id}`} className="h3">
                            {l.name}
                          </h2>
                          <p className="muted">
                            {LISTING_TYPE_LABEL[l.type]} · {l.area}
                          </p>
                        </div>
                        <div className="row">
                          <StatusPill tone={m.tone} icon={m.icon} label={m.label} />
                          <StatusPill tone={v.tone} icon={v.icon} label={v.label} />
                        </div>
                      </div>
                      <BedCounts counts={l.beds} label={`Beds at ${l.name} by state`} />
                      <div className="prop-f">
                        <p className="muted">
                          {formatUpdated(l.last_updated_at)}
                          {stale ? " " : ""}
                          {stale ? <StatusPill tone="warn" icon="clock" label="Not updated for over 30 days" /> : null}
                        </p>
                        <div className="row">
                          <ConfirmAvailability listingId={l.id} name={l.name} />
                          <Link className="btn sm primary" href={`/owner/listings/${l.id}`}>
                            Rooms and beds<span className="sr-only"> at {l.name}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card">
            <EmptyState as="h2" icon="building" title="You have no properties yet.">
              Properties you add appear here with their rooms and beds.
            </EmptyState>
          </div>
        )
      ) : null}
    </div>
  );
}
