import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/Callout";
import { ListingCard } from "@/components/listings/ListingCard";
import { RemoveFromShortlist } from "@/components/listings/RemoveFromShortlist";
import { reportError } from "@/lib/errors";
import { compareHref } from "@/lib/listings/compare";
import { cardsByIds, shortlistFor } from "@/server/listings";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Your shortlist" };

export default async function ShortlistPage() {
  const session = await requireRole("student", "/student/shortlist");

  let saved: { listing_id: string; created_at: string }[] = [];
  let cards: Awaited<ReturnType<typeof cardsByIds>> = [];
  let error: { reference: string } | null = null;
  try {
    saved = await shortlistFor(session.userId);
    cards = await cardsByIds(saved.map((s) => s.listing_id));
  } catch (err) {
    unstable_rethrow(err);
    error = reportError("load shortlist", err);
  }

  const listed = saved.map((s) => cards.find((c) => c.id === s.listing_id)).filter((c) => !!c);
  const gone = saved.filter((s) => !cards.some((c) => c.id === s.listing_id));

  return (
    <div className="stack">
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Your shortlist</h1>
        <p>Places you saved. Only you can see this list.</p>
      </div>

      {error ? <ErrorNotice message="We could not load your shortlist just now. Please try again." reference={error.reference} /> : null}

      {!error && saved.length === 0 ? (
        <div className="card">
          <EmptyState icon="heart" title="You have not saved any places yet.">
            Press the heart on a place to save it here.
          </EmptyState>
          <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
            <Link className="btn primary" href="/listings">
              Find a place
            </Link>
          </div>
        </div>
      ) : null}

      {listed.length >= 2 ? (
        <div className="row">
          <Link className="btn soft" href={compareHref(listed.slice(0, 3).map((c) => c.id))}>
            Compare {listed.length > 3 ? "the first three" : "these places"}
          </Link>
        </div>
      ) : null}

      {listed.length ? (
        <ul className="lcards">
          {listed.map((c) => (
            <li key={c.id} style={{ display: "grid", gap: ".5rem", alignContent: "start" }}>
              <ListingCard card={c} heart="hidden" returnTo="/student/shortlist" />
              <RemoveFromShortlist listingId={c.id} name={c.name ?? "this place"} />
            </li>
          ))}
        </ul>
      ) : null}

      {gone.length ? (
        <section className="card card-b stack" aria-labelledby="gone-h">
          <h2 id="gone-h" style={{ fontSize: "1rem" }}>
            No longer listed
          </h2>
          <p className="muted">
            {gone.length === 1 ? "One saved place is" : `${gone.length} saved places are`} not published at the moment.
          </p>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: ".5rem" }}>
            {gone.map((g) => (
              <li key={g.listing_id} className="row">
                <span className="muted">A place you saved</span>
                <RemoveFromShortlist listingId={g.listing_id} name="this place" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
