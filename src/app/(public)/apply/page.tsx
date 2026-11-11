import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { signInUrlFor } from "@/lib/auth/roles";
import { isUuid } from "@/lib/listings/compare";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Apply" };

// TODO(S4): applications are built in slice S4. This placeholder only keeps the Apply buttons working.
// Signed-out visitors go to sign in and come back here with the same listing.
export default async function ApplyPage({ searchParams }: PageProps<"/apply">) {
  const sp = await searchParams;
  const listing = typeof sp.listing === "string" && isUuid(sp.listing) ? sp.listing : null;
  const here = listing ? `/apply?listing=${listing}` : "/apply";

  const session = await getSession();
  if (!session) redirect(signInUrlFor(here));

  return (
    <div className="wrap main">
      <div className="card" style={{ maxWidth: "36rem", margin: "1.5rem auto" }}>
        <EmptyState icon="calendar" title="Applications open in the next release.">
          You will be able to apply for a university allocation or to a private owner here. Save places to your shortlist
          in the meantime.
        </EmptyState>
        <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
          {listing ? (
            <Link className="btn primary" href={`/listings/${listing}`}>
              Back to the place
            </Link>
          ) : null}
          <Link className="btn ghost" href="/listings">
            Find a place
          </Link>
        </div>
      </div>
    </div>
  );
}
