import type { Metadata } from "next";
import { Home, flag } from "@/components/shell/Home";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function SystemHome(props: PageProps<"/system">) {
  const session = await requireRole("system_admin", "/system");
  const params = await props.searchParams;
  return (
    <Home
      name={session.profile.full_name}
      subtitle="System administrator"
      passwordUpdated={flag(params.password)}
      links={[
        { href: "/system/profile", title: "Profile", text: "Your name, phone and updates", icon: "user" },
        { href: "/system/audit", title: "Audit log", text: "All actions on the platform", icon: "list" },
      ]}
    />
  );
}
