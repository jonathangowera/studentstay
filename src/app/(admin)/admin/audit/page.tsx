import type { Metadata } from "next";
import { AuditLog } from "@/components/audit/AuditLog";
import { parsePage } from "@/lib/audit";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage(props: PageProps<"/admin/audit">) {
  const session = await requireRole("university_admin", "/admin/audit");
  const page = parsePage((await props.searchParams).page);
  return <AuditLog session={session} scope="university_admin" page={page} basePath="/admin/audit" />;
}
