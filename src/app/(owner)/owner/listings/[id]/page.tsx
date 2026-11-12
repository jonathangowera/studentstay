import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { ConfirmAvailability } from "@/components/owner/ConfirmAvailability";
import { RoomsBoard, type BoardRoom } from "@/components/owner/RoomsBoard";
import { BedCounts } from "@/components/ui/BedCounts";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { reportError } from "@/lib/errors";
import { formatDateTimeCAT, formatUpdated, perUnit } from "@/lib/format";
import { ownerBedMoves } from "@/lib/listings/beds";
import { LISTING_TYPE_LABEL, moderationBadge, verificationBadge } from "@/lib/listings/labels";
import type { TransitionRow } from "@/lib/transitions";
import { createClient } from "@/lib/supabase/server";
import { ownerBusinesses, ownerListingDetail, type OwnerListingDetail } from "@/server/owner";
import { transitionsFor } from "@/server/tickets";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Rooms and beds" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OwnerListing(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await requireRole("owner", UUID.test(id) ? `/owner/listings/${id}` : "/owner/listings");
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  let listing: OwnerListingDetail | null = null;
  let rows: TransitionRow[] = [];
  let errorRef: string | null = null;
  try {
    const businesses = await ownerBusinesses(supabase, session.userId);
    [listing, rows] = await Promise.all([
      ownerListingDetail(
        supabase,
        businesses.map((b) => b.id),
        id,
      ),
      transitionsFor(supabase, "bed"),
    ]);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load owner listing", err).reference;
  }
  if (!errorRef && !listing) notFound();

  const rooms: BoardRoom[] = listing
    ? listing.rooms.map((r) => ({
        id: r.id,
        number: r.room_number,
        type: r.room_type,
        price: r.price_zmw,
        wing: r.wing,
        beds: r.beds.map((b) => ({
          id: b.id,
          label: b.label,
          state: b.state,
          note: b.state_note,
          changedText: `Changed ${formatDateTimeCAT(b.state_changed_at)}`,
          moves: ownerBedMoves(rows, b.state),
        })),
      }))
    : [];

  return (
    <div className="stack">
      <p>
        <Link href="/owner/listings" className="back">
          <Icon name="arrow-l" />
          <span>My properties</span>
        </Link>
      </p>
      {errorRef ? <ErrorNotice message="We could not load this property just now. Please try again." reference={errorRef} /> : null}
      {listing ? (
        <>
          <div className="page-head">
            <div>
              <h1>{listing.name}</h1>
              <p className="sub">
                {LISTING_TYPE_LABEL[listing.type]} · {listing.area} · {formatUpdated(listing.last_updated_at)}. Times are Central Africa Time.
              </p>
            </div>
            <div className="actions">
              <StatusPill {...moderationBadge(listing.moderation)} />
              <StatusPill {...verificationBadge(listing.verification)} />
            </div>
          </div>
          <section className="card" aria-labelledby="sum-h">
            <div className="card-h">
              <div>
                <h2 id="sum-h">Beds by state</h2>
                <p className="sub">Confirm availability whenever you check it, so students see it is current.</p>
              </div>
              <ConfirmAvailability listingId={listing.id} name={listing.name} />
            </div>
            <div className="card-b">
              <BedCounts counts={listing.bedCounts} label={`Beds at ${listing.name} by state`} />
            </div>
          </section>
          <Callout tone="info" title="What you can change here">
            Block a free bed for maintenance and free it again, mark a reserved bed occupied when the student moves in, and mark it available when they
            move out. Held and pending approval beds are set by an application.
          </Callout>
          <section className="card" aria-labelledby="rooms-h">
            <div className="card-h">
              <h2 id="rooms-h">Rooms and beds</h2>
            </div>
            <div className="card-b">
              {rooms.length ? (
                <RoomsBoard listingId={listing.id} rooms={rooms} unitLabel={perUnit(listing.rent_unit)} />
              ) : (
                <EmptyState icon="bed" title="This property has no rooms yet." />
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
