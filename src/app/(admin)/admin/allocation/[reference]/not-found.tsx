import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AllocationNotFound() {
  return (
    <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
      <EmptyState as="h1" icon="file" title="We could not find that application.">
        It may belong to another institution, or it is a private application that the owner decides.
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        <Link className="btn primary" href="/admin/applications">
          See applications
        </Link>
      </div>
    </div>
  );
}
