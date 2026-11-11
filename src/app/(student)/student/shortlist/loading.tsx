import { ListingCardSkeleton } from "@/components/listings/ListingCard";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your shortlist…</span>
      <div aria-hidden="true">
        <div className="pg-head">
          <span className="skel" style={{ width: "12rem", height: "2rem" }} />
          <span className="skel" style={{ width: "18rem", maxWidth: "100%", marginTop: ".6rem" }} />
        </div>
        <div className="lcards">
          {Array.from({ length: 3 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
