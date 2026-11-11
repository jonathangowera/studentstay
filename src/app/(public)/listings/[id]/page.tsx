import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { ListingImage } from "@/components/listings/ListingImage";
import { BedsPill, BedStateLegend, FacilityList, NotAGuarantee, StaleNote, UpdatedPill, VerificationPill } from "@/components/listings/ListingBits";
import { DetailTabs } from "@/components/listings/DetailTabs";
import { BedGrid } from "@/components/listings/BedGrid";
import { HeartButton } from "@/components/listings/HeartButton";
import { formatKm, formatKwacha, formatUpdated, perUnit, plural, priceRange } from "@/lib/format";
import { GENDER_LABEL, LISTING_TYPE_LABEL, ROOM_TYPE_LABEL, institutionShortName } from "@/lib/listings/labels";
import { summariseRoomTypes } from "@/lib/listings/rooms";
import { listingDetail, savedListingIds } from "@/server/listings";
import { getViewer } from "@/server/viewer";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await listingDetail(id);
  return { title: d?.card.name ?? "Place not found" };
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const [detail, viewer] = await Promise.all([listingDetail(id), getViewer()]);
  if (!detail) notFound();

  const { card, listing, rooms, distances } = detail;
  const name = card.name ?? "Listing";
  const saved = await savedListingIds(viewer.studentId, [card.id]);
  const types = summariseRoomTypes(rooms);
  const nearest = distances[0];
  const partnered = distances.filter((d) => d.partnered);
  const unit = perUnit(card.rent_unit);
  const applyHref = `/apply?listing=${card.id}`;
  const returnTo = `/listings/${card.id}`;
  const who = card.gender_note || (card.gender ? GENDER_LABEL[card.gender] : "");

  const overview = (
    <>
      <h2 className="sr-only">Overview</h2>
      <dl className="ftiles">
        <div className="ftile">
          <dt>Rooms</dt>
          <dd>{rooms.length}</dd>
        </div>
        <div className="ftile">
          <dt>Total beds</dt>
          <dd>{card.beds_total ?? 0}</dd>
        </div>
        <div className="ftile">
          <dt>{nearest ? `Distance to ${institutionShortName(nearest.code, nearest.name)}` : "Distance to campus"}</dt>
          <dd>{nearest ? formatKm(nearest.km) : "Not listed"}</dd>
        </div>
        <div className="ftile">
          <dt>Deposit</dt>
          <dd>{listing.deposit_note || "Ask the owner"}</dd>
        </div>
        <div className="ftile">
          <dt>Minimum stay</dt>
          <dd>{listing.min_stay_note || "Ask the owner"}</dd>
        </div>
        <div className="ftile">
          <dt>Rent period</dt>
          <dd>{card.rent_unit === "term" ? "Per term" : "Monthly"}</dd>
        </div>
      </dl>
      {listing.description ? <p>{listing.description}</p> : null}
      <section aria-labelledby="fac-h">
        <h2 id="fac-h" style={{ marginBottom: ".6rem" }}>
          Facilities
        </h2>
        <FacilityList keys={card.facilities} />
      </section>
      <section aria-labelledby="rt-h">
        <h2 id="rt-h" style={{ marginBottom: ".6rem" }}>
          Room types
        </h2>
        {types.length ? (
          <ul className="roomtypes">
            {types.map((t) => (
              <li className="rt" key={t.type}>
                <span className="rti">
                  <Icon name="bed" />
                </span>
                <div>
                  <b>{ROOM_TYPE_LABEL[t.type]} room</b>
                  <p>
                    {plural(t.rooms, "room")}
                    {t.note ? `. ${t.note}` : ""}
                  </p>
                </div>
                <div className="rtp">
                  <b>
                    {t.priceFrom === t.priceTo ? formatKwacha(t.priceFrom) : `${formatKwacha(t.priceFrom)} to ${formatKwacha(t.priceTo)}`}
                    <small className="muted" style={{ fontWeight: 400, fontSize: ".8125rem" }}>
                      {" "}
                      {unit}
                    </small>
                  </b>
                  <BedsPill available={t.free} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No rooms are listed yet.</p>
        )}
      </section>
    </>
  );

  const availability = (
    <>
      <h2>Beds right now</h2>
      <p className="muted" style={{ fontSize: ".875rem" }}>
        Beds shown as available are free at this moment. Beds that are held for another applicant may return to the list if
        the hold expires.
      </p>
      <BedStateLegend />
      <BedGrid rooms={rooms} />
      <Link className="btn soft" href={`/listings/${card.id}/availability`}>
        <Icon name="calendar" />
        <span>See full availability</span>
      </Link>
    </>
  );

  const location = (
    <>
      <h2>Location</h2>
      {listing.address ? (
        <p style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
          <Icon name="pin" />
          {listing.address}
        </p>
      ) : null}
      {distances.length ? (
        <ul className="dist">
          {distances.map((d) => (
            <li key={d.code}>
              <Icon name="cap" />
              <span>
                {d.name}
                {d.partnered ? (
                  <>
                    {" "}
                    <StatusPill tone="info" icon="check-c" label={`Recognised by ${institutionShortName(d.code, d.name)}`} />
                  </>
                ) : null}
              </span>
              <b>{formatKm(d.km)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No campus distances are listed.</p>
      )}
      <p className="muted" style={{ fontSize: ".8125rem" }}>
        Distances are approximate road distances.
      </p>
    </>
  );

  const rules = (
    <>
      <h2>House rules</h2>
      <ul className="rules-list">
        <li>
          <Icon name="file" />
          <div>
            <b>Rules</b>
            <p>{listing.house_rules || "The owner has not listed house rules yet."}</p>
          </div>
        </li>
        <li>
          <Icon name="key" />
          <div>
            <b>Deposit</b>
            <p>{listing.deposit_note || "Ask the owner about the deposit."}</p>
          </div>
        </li>
        <li>
          <Icon name="calendar" />
          <div>
            <b>Minimum stay</b>
            <p>{listing.min_stay_note || "Ask the owner about the minimum stay."}</p>
          </div>
        </li>
        <li>
          <Icon name="alert" />
          <div>
            <b>Repairs</b>
            <p>Report faults from your dashboard once you live here. You can follow each request until it is completed.</p>
          </div>
        </li>
      </ul>
    </>
  );

  return (
    <div className="wrap main">
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/listings">Listings</Link>
          </li>
          <li aria-current="page">{name}</li>
        </ol>
      </nav>

      <div className="gallery">
        {[
          ["front", "Front"],
          ["common", "Common area"],
          ["bedroom", "Bedroom"],
        ].map(([v, label], i) => (
          <figure key={v}>
            <ListingImage id={card.id} variant={i === 0 ? undefined : v} alt={`${name}, illustration of the ${label.toLowerCase()}`} />
            <figcaption aria-hidden="true">Illustration, {label.toLowerCase()}</figcaption>
          </figure>
        ))}
      </div>

      <div className="dgrid">
        <div className="stack">
          <div className="dh">
            <h1>{name}</h1>
            <p className="meta">
              <span>
                <Icon name="pin" />
                {card.area}, Lusaka
              </span>
              {card.type ? (
                <span>
                  <Icon name="building" />
                  {LISTING_TYPE_LABEL[card.type]}
                </span>
              ) : null}
              {who ? (
                <span>
                  <Icon name="users" />
                  {who}
                </span>
              ) : null}
            </p>
            <div className="pills">
              <VerificationPill value={card.verification} />
              <BedsPill available={card.beds_available} />
              <UpdatedPill iso={card.last_updated_at} />
            </div>
            <div style={{ marginTop: ".6rem" }}>
              <StaleNote iso={card.last_updated_at} isStale={card.is_stale} />
            </div>
          </div>

          <DetailTabs
            label={`About ${name}`}
            panels={[
              { id: "overview", label: "Overview", content: overview },
              { id: "availability", label: "Availability", content: availability },
              { id: "location", label: "Location", content: location },
              { id: "rules", label: "House rules", content: rules },
            ]}
          />
        </div>

        <aside className="buy" aria-labelledby="buy-h">
          <h2 id="buy-h" className="sr-only">
            Apply for {name}
          </h2>
          <p className="pr">
            <b>{priceRange(card.price_from, card.price_to, card.rent_unit)}</b>
            <small>
              {plural(Number(card.beds_available ?? 0), "bed")} available
              {card.last_updated_at ? `, ${formatUpdated(card.last_updated_at).toLowerCase()}` : ""}
            </small>
          </p>
          <Link className="btn primary block" href={applyHref}>
            <Icon name="file" />
            <span>Apply for this place</span>
          </Link>
          {viewer.heart !== "hidden" ? (
            <div className="fav-row">
              <HeartButton
                mode={viewer.heart}
                variant="full"
                listingId={card.id}
                listingName={name}
                initialSaved={saved.has(card.id)}
                returnTo={returnTo}
              />
            </div>
          ) : null}
          <div className="callout c-info">
            <Icon name="info" />
            <div>
              <b>Two ways to apply</b>
              <p>
                {card.type === "university_hostel"
                  ? "Beds in a university hostel are allocated by the accommodation office. An administrator approves every allocation."
                  : partnered.length
                    ? `If you are a ${partnered.map((d) => institutionShortName(d.code, d.name)).join(" or ")} student you can request a university allocation. Otherwise apply to the owner directly.`
                    : "Apply to the owner directly. The owner reviews your application and documents."}
              </p>
            </div>
          </div>
          {card.managed_by ? (
            <p className="muted" style={{ fontSize: ".8125rem" }}>
              Managed by {card.managed_by}. You can contact the owner after you apply.
            </p>
          ) : null}
          <NotAGuarantee compact />
        </aside>
      </div>
    </div>
  );
}
