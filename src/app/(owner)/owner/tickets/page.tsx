import type { Metadata } from "next";
import { RepairsPage } from "@/components/tickets/RepairsPage";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Maintenance tickets" };

export default async function OwnerTickets() {
  const session = await requireRole("owner", "/owner/tickets");
  return (
    <RepairsPage
      manager={{ role: "owner", userId: session.userId, institutionId: null }}
      from="/owner/tickets"
      sub="Reports from tenants of your properties. Assign a technician and follow each request to completion."
    />
  );
}
