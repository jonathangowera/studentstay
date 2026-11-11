import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ApplicationNotFound() {
  return (
    <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
      <EmptyState as="h1" icon="file" title="We could not find that application.">
        Check the reference, or open it from your list of applications.
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        <Link className="btn primary" href="/student/applications">
          See your applications
        </Link>
      </div>
    </div>
  );
}
