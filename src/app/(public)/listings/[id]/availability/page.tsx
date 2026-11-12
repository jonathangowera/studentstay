import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { BedStateLegend, StaleNote } from "@/components/listings/ListingBits";
import { BedGrid } from "@/components/listings/BedGrid";
import { formatDateTimeCAT, formatKwacha, formatUpdated, perUnit, plural } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { summariseRoomTypes } from "@/lib/listings/rooms";
import { listingDetail } from "@/server/listings";
import { openApplicationForPlace } from "@/server/applications";
import { getViewer } from "@/server/viewer";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/listings/[id]/availability">): Promise<Metadata> {
  const { id } = await params;
  const d = await listingDetail(id);
  return { title: d ? `Availability at ${d.card.name}` : "Place not found" };
}

export default async function AvailabilityPage({ params }: PageProps<"/listings/[id]/availability">) {
  const { id } = await params;
  const [detail, viewer] = await Promise.all([listingDetail(id), getViewer()]);
  if (!detail) notFound();
  const appliedRef = viewer.studentId ? await openApplicationForPlace(await createClient(), viewer.studentId, detail.card.id) : null;

  const { card, rooms } = detail;
  const name = card.name ?? "Listing";
  const types = summariseRoomTypes(rooms);
  const unit = perUnit(card.rent_unit);

  return (
    <div className="wrap main">
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/listings">Listings</Link>
          </li>
          <li>
            <Link href={`/listings/${card.id}`}>{name}</Link>
          </li>
          <li aria-current="page">Availability</li>
        </ol>
      </nav>
      <div className="pg-head">
        <h1>Availability</h1>
        <p>
          {name}
          {card.last_updated_at ? (
            <>
              {" · "}
              <time dateTime={card.last_updated_at} title={formatDateTimeCAT(card.last_updated_at)}>
                {formatUpdated(card.last_updated_at)}
              </time>
            </>
          ) : null}
        </p>
        <div style={{ marginTop: ".5rem" }}>
          <StaleNote iso={card.last_updated_at} isStale={card.is_stale} />
        </div>
      </div>

      <div className="stack">
        <section className="card" aria-labelledby="by-type-h">
          <div className="card-h">
            <div>
              <h2 id="by-type-h">By room type</h2>
              <p className="sub">Prices are {unit}.</p>
            </div>
          </div>
          <div className="card-b">
            {types.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <caption className="sr-only">Room availability at {name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Room type</th>
                      <th scope="col">Price {card.rent_unit === "term" ? "per term" : "per month"}</th>
                      <th scope="col">Beds free</th>
                      <th scope="col">Notes</th>
                      <th scope="col">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => (
                      <tr key={t.type}>
                        <th scope="row" style={{ fontSize: ".875rem", color: "var(--ink)" }}>
                          {ROOM_TYPE_LABEL[t.type]}
                        </th>
                        <td>{t.priceFrom === t.priceTo ? formatKwacha(t.priceFrom) : `${formatKwacha(t.priceFrom)} to ${formatKwacha(t.priceTo)}`}</td>
                        <td>
                          {t.free > 0 ? (
                            <StatusPill tone="ok" icon="bed" label={`${plural(t.free, "bed")} available`} />
                          ) : (
                            <StatusPill tone="mute" icon="ban" label="None free" />
                          )}
                        </td>
                        <td>{t.note || "None"}</td>
                        <td>
                          {appliedRef ? (
                            <Link className="btn sm soft" href={`/student/applications/${appliedRef}`}>
                              <Icon name="check-c" />
                              <span>You have applied</span>
                            </Link>
                          ) : t.free > 0 ? (
                            <Link className="btn sm primary" href={`/apply?listing=${card.id}`}>
                              Apply<span className="sr-only"> for a {ROOM_TYPE_LABEL[t.type].toLowerCase()} room</span>
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No rooms are listed yet.</p>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="guide-h">
          <div className="card-h">
            <h2 id="guide-h">Bed status guide</h2>
          </div>
          <div className="card-b">
            <BedStateLegend />
          </div>
        </section>

        <section className="card" aria-labelledby="rooms-h">
          <div className="card-h">
            <h2 id="rooms-h">Room by room</h2>
          </div>
          <div className="card-b">
            <BedGrid rooms={rooms} />
          </div>
        </section>

        <div className="row">
          <Link className="btn" href={`/listings/${card.id}`}>
            <Icon name="arrow-l" />
            <span>Back to {name}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
