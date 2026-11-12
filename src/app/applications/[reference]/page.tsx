import { redirect } from "next/navigation";
import { applicationRedirect } from "@/lib/notifications";

/**
 * The database writes notification links as /applications/APP-2026-0412 (_notify in the initial schema).
 * Send them to the student pages. Only a real reference (APP-YYYY-NNNN) goes to the tracker; anything else goes
 * to the list. The student pages check the role and the owner of the application.
 */
export default async function ApplicationLinkRedirect({ params }: PageProps<"/applications/[reference]">) {
  const { reference } = await params;
  redirect(applicationRedirect(reference));
}
