import { ListingCardSkeleton } from "@/components/listings/ListingCard";

/** Same frame as the listings page, so nothing jumps when the results arrive. */
export default function Loading() {
  return (
    <div className="wrap main" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading places…</span>
      <div className="pg-head" aria-hidden="true">
        <span className="skel" style={{ width: "16rem", maxWidth: "100%", height: "2rem" }} />
        <span className="skel" style={{ width: "28rem", maxWidth: "100%", marginTop: ".6rem" }} />
      </div>
      <div className="lay" aria-hidden="true">
        <div className="filters">
          <span className="skel" style={{ width: "40%", height: "1.2rem" }} />
          <span className="skel" style={{ width: "80%" }} />
          <span className="skel" style={{ width: "70%" }} />
          <span className="skel" style={{ width: "75%" }} />
        </div>
        <div>
          <div className="rbar">
            <span className="skel" style={{ width: "10rem", height: "1.2rem" }} />
            <span className="skel" style={{ width: "14rem", height: "2.5rem" }} />
          </div>
          <div className="lcards">
            {Array.from({ length: 6 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
