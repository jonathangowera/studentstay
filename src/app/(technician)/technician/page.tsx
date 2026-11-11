import type { Metadata } from "next";
import { Home, flag } from "@/components/shell/Home";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

export default async function TechnicianHome(props: PageProps<"/technician">) {
  const session = await requireRole("technician", "/technician");
  const params = await props.searchParams;
  return (
    <Home
      name={session.profile.full_name}
      subtitle="Technician. Your repair jobs will appear here in a later release."
      passwordUpdated={flag(params.password)}
      links={[{ href: "/technician/profile", title: "Profile", text: "Your name, phone and updates", icon: "user" }]}
    />
  );
}
