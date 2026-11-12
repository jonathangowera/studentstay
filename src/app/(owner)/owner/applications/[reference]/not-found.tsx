import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function OwnerApplicationNotFound() {
  return (
    <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
      <EmptyState as="h1" icon="file" title="We could not find that application.">
        It may have been sent to another property, or it is a university allocation that the university handles.
      </EmptyState>
      <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
        <Link className="btn primary" href="/owner/applications">
          See private applications
        </Link>
      </div>
    </div>
  );
}
