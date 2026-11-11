import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home, flag } from "@/components/shell/Home";
import { Callout } from "@/components/ui/Callout";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function OwnerHome(props: PageProps<"/owner">) {
  const session = await requireRole("owner", "/owner");
  const params = await props.searchParams;

  const supabase = await createClient();
  const { data: partners, error } = await supabase
    .from("partners")
    .select("id, business_name, contact_phone")
    .eq("owner_id", session.userId)
    .order("created_at")
    .limit(1);
  if (error) throw new Error(`Could not load your business (${reportError("load business", error).reference})`);
  const business = partners[0];
  if (!business) redirect("/owner/setup");

  return (
    <Home
      name={session.profile.full_name}
      subtitle="Demonstration data. Listings, rooms and beds arrive in the next release."
      passwordUpdated={flag(params.password)}
      links={[
        { href: "/owner/profile", title: "Profile", text: "Your name, phone and updates", icon: "user" },
        { href: "/owner/audit", title: "Audit log", text: "Actions you have taken", icon: "list" },
      ]}
    >
      {flag(params.welcome) ? <Callout tone="ok" title="Your business is set up." role="status" /> : null}
      <section className="card" aria-labelledby="biz-h">
        <div className="card-h">
          <h2 id="biz-h">Your business</h2>
        </div>
        <div className="card-b">
          <dl className="facts">
            <dt>Business name</dt>
            <dd>{business.business_name}</dd>
            <dt>Contact phone</dt>
            <dd>{business.contact_phone ?? "Not added"}</dd>
          </dl>
        </div>
      </section>
    </Home>
  );
}
