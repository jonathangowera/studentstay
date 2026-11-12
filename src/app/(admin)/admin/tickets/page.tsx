import type { Metadata } from "next";
import { RepairsPage } from "@/components/tickets/RepairsPage";
import { Callout } from "@/components/ui/Callout";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Maintenance tickets" };

export default async function AdminTickets() {
  const session = await requireRole("university_admin", "/admin/tickets");
  if (!session.profile.institution_id) {
    return (
      <div className="stack">
        <div className="page-head">
          <h1>Maintenance tickets</h1>
        </div>
        <Callout tone="warn" title="Your account is not linked to an institution yet.">
          Ask the system administrator to link it. Until then you cannot see repair requests.
        </Callout>
      </div>
    );
  }
  return (
    <RepairsPage
      manager={{ role: "university_admin", userId: session.userId, institutionId: session.profile.institution_id }}
      from="/admin/tickets"
      sub="Repairs at properties partnered with your institution and hostels it runs. Assign a technician or escalate."
    />
  );
}
