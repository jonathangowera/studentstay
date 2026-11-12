import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TicketNotFound() {
  return (
    <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
      <EmptyState as="h1" icon="file" title="We could not find that repair request.">
        You can open only the requests assigned to you.
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        <Link className="btn primary" href="/technician">
          See my jobs
        </Link>
      </div>
    </div>
  );
}
