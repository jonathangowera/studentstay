import type { Metadata } from "next";
import { Home, flag } from "@/components/shell/Home";
import { Callout } from "@/components/ui/Callout";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errors";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function AdminHome(props: PageProps<"/admin">) {
  const session = await requireRole("university_admin", "/admin");
  const params = await props.searchParams;

  let institution: string | null = null;
  if (session.profile.institution_id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("institutions")
      .select("name")
      .eq("id", session.profile.institution_id)
      .maybeSingle();
    if (error) reportError("load institution", error);
    institution = data?.name ?? null;
  }

  return (
    <Home
      name={session.profile.full_name}
      subtitle={institution ? `University administrator · ${institution}` : "University administrator"}
      passwordUpdated={flag(params.password)}
      links={[
        { href: "/admin/profile", title: "Profile", text: "Your name, phone and updates", icon: "user" },
        { href: "/admin/audit", title: "Audit log", text: "Actions in your institution", icon: "list" },
      ]}
    >
      {!institution ? (
        <Callout tone="warn" title="Your account is not linked to an institution yet.">
          Ask the system administrator to link it. Until then the audit log shows only your own actions.
        </Callout>
      ) : null}
    </Home>
  );
}
