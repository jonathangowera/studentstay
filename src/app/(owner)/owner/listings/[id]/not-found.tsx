import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OwnerListingNotFound() {
  return (
    <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
      <EmptyState as="h1" icon="building" title="We could not find that property.">
        You can open only the properties of your own business.
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        <Link className="btn primary" href="/owner/listings">
          See my properties
        </Link>
      </div>
    </div>
  );
}
