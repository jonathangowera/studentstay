import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { ListingsBoard, type SystemListingRow } from "@/components/system/ListingsBoard";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { formatUpdated } from "@/lib/format";
import { LISTING_TYPE_LABEL, moderationBadge, verificationBadge } from "@/lib/listings/labels";
import { moderationMoves } from "@/lib/listings/moderation";
import { createClient } from "@/lib/supabase/server";
import { allListings } from "@/server/system";
import { transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Listings" };

export default async function SystemListings() {
  await requireRole("system_admin", "/system/listings");

  let rows: SystemListingRow[] | null = null;
  let errorRef: string | null = null;
  try {
    const supabase = await createClient();
    const [listings, transitions] = await Promise.all([allListings(supabase), transitionsFor(supabase, "listing")]);
    rows = listings.map((l) => ({
      id: l.id,
      name: l.name,
      typeLabel: LISTING_TYPE_LABEL[l.type],
      area: l.area,
      partner: l.partner ?? "Not linked",
      moderation: moderationBadge(l.moderation),
      verification: verificationBadge(l.verification),
      updatedText: formatUpdated(l.last_updated_at),
      beds: l.beds,
      moves: moderationMoves(transitions, l.moderation),
    }));
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load system listings", err).reference;
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Listings</h1>
          <p className="sub">
            Every listing on the platform. Publish a listing awaiting moderation, suspend one with a reason, or return a suspended listing to moderation.
          </p>
        </div>
      </div>
      {errorRef ? <ErrorNotice message="We could not load the listings just now. Please try again." reference={errorRef} /> : null}
      {rows ? (
        rows.length ? (
          <ListingsBoard rows={rows} />
        ) : (
          <div className="card">
            <EmptyState as="h2" icon="building" title="There are no listings yet." />
          </div>
        )
      ) : null}
    </div>
  );
}
