import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ListingNotFound() {
  return (
    <div className="wrap main">
      <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
        <EmptyState as="h1" icon="building" title="We could not find that place.">
          It may have been removed, or it is not published yet. Try searching again.
        </EmptyState>
        <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
          <Link className="btn primary" href="/listings">
            Find a place
          </Link>
          <Link className="btn ghost" href="/">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
