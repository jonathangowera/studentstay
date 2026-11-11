import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { ListingCardData } from "@/server/listings";
import { cardDistances, institutionShortName, LISTING_TYPE_LABEL } from "@/lib/listings/labels";
import { formatDistance, formatKwacha, perUnit } from "@/lib/format";
import type { HeartMode } from "@/lib/listings/shortlist";
import { ListingImage } from "./ListingImage";
import { BedsPill, StaleNote, Updated, VerificationPill } from "./ListingBits";
import { HeartButton } from "./HeartButton";
import { CompareToggle } from "./Compare";

export function ListingCard({
  card,
  institution = null,
  heart,
  saved = false,
  returnTo,
  compare = false,
  headingLevel = 3,
}: {
  card: ListingCardData;
  institution?: string | null;
  heart: HeartMode;
  saved?: boolean;
  returnTo: string;
  compare?: boolean;
  headingLevel?: 2 | 3;
}) {
  const name = card.name ?? "Listing";
  const href = `/listings/${card.id}`;
  const distances = cardDistances(card.distances, institution);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="lcard">
      <div className="lc-media">
        <ListingImage id={card.id} alt="" />
        {card.type ? <span className="lc-badge">{LISTING_TYPE_LABEL[card.type]}</span> : null}
        {heart !== "hidden" ? (
          <span className="lc-fav">
            <HeartButton mode={heart} listingId={card.id} listingName={name} initialSaved={saved} returnTo={returnTo} />
          </span>
        ) : null}
      </div>
      <div className="lc-body">
        <H>
          <Link href={href}>{name}</Link>
        </H>
        <p className="lc-loc">
          <Icon name="pin" />
          {card.area}, Lusaka
        </p>
        {distances.length ? (
          <p className="lc-dist">
            <Icon name="compass" />
            {distances.map((d) => formatDistance(d.km, institutionShortName(d.code))).join(" · ")}
          </p>
        ) : null}
        <p className="lc-price">
          {card.price_from !== null ? (
            <>
              <b>{formatKwacha(card.price_from)}</b>
              <small>from, {perUnit(card.rent_unit)}</small>
            </>
          ) : (
            <small>Price not listed</small>
          )}
        </p>
        <div className="lc-status">
          <VerificationPill value={card.verification} />
          <BedsPill available={card.beds_available} />
        </div>
        <StaleNote iso={card.last_updated_at} isStale={card.is_stale} />
        <Updated iso={card.last_updated_at} />
        <div className="lc-actions">
          {compare ? <CompareToggle id={card.id} name={name} /> : <span />}
          <Link className="btn sm soft" href={href}>
            View details<span className="sr-only"> of {name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Placeholder with the same shape as a card, so the page does not jump when results arrive. */
export function ListingCardSkeleton() {
  return (
    <div className="lcard skel-card" aria-hidden="true">
      <span className="skel skel-media" />
      <span className="skel" style={{ width: "70%", height: "1.2rem" }} />
      <span className="skel" style={{ width: "50%" }} />
      <span className="skel" style={{ width: "80%" }} />
      <span className="skel" style={{ width: "40%", height: "1.4rem" }} />
      <span className="skel" style={{ width: "75%" }} />
      <span className="skel" style={{ width: "35%" }} />
    </div>
  );
}
