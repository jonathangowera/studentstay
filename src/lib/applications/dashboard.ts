/**
 * The student dashboard's "Next steps", worked out from real data. Pure and unit tested.
 */
import type { IconName } from "@/components/ui/Icon";
import { isEditable, isOpen, type ApplicationRoute, type ApplicationStatus } from "./status";

export type NextStep = { key: string; title: string; text: string; href: string; action: string; icon: IconName };

export type DashboardFacts = {
  emailVerified: boolean;
  profile: { institution_id: string | null; student_number: string | null; emergency_contact: string | null };
  /** Newest first. */
  apps: { reference: string; route: ApplicationRoute; status: ApplicationStatus }[];
  shortlistCount: number;
  unreadCount: number;
};

/** At most four steps, most important first. */
export function nextSteps(f: DashboardFacts): NextStep[] {
  const out: NextStep[] = [];
  const unfinished = f.apps.find((a) => isEditable(a.status));
  const open = f.apps.find((a) => isOpen(a.status));

  if (!f.emailVerified) {
    out.push({ key: "verify", title: "Verify your email", text: "Open the link we sent you. You need it to apply.", href: "/student/profile", action: "Open profile", icon: "mail" });
  }
  if (unfinished) {
    out.push({
      key: "finish",
      title: "Finish your application",
      text: `${unfinished.reference} has not gone through yet.`,
      href: `/apply?application=${unfinished.reference}`,
      action: "Continue",
      icon: "file",
    });
  }
  if (!f.profile.institution_id || !f.profile.student_number) {
    out.push({
      key: "student-details",
      title: "Add your student details",
      text: "Your institution and student number are needed for a university allocation.",
      href: "/student/profile",
      action: "Open",
      icon: "cap",
    });
  } else if (!f.profile.emergency_contact) {
    out.push({ key: "profile", title: "Complete your profile", text: "Add an emergency contact.", href: "/student/profile", action: "Open", icon: "user" });
  }
  if (!open) {
    out.push({ key: "browse", title: "Find a place", text: "Search places near your campus and apply.", href: "/listings", action: "Browse", icon: "search" });
  } else if (!unfinished) {
    out.push({
      key: "backup",
      title: "Keep browsing while you wait",
      text: f.shortlistCount ? "Compare the places on your shortlist as a backup." : "Shortlist other places as a backup.",
      href: f.shortlistCount ? "/student/shortlist" : "/listings",
      action: f.shortlistCount ? "Shortlist" : "Browse",
      icon: "heart",
    });
  }
  if (f.unreadCount > 0) {
    out.push({
      key: "updates",
      title: "Read your updates",
      text: f.unreadCount === 1 ? "You have 1 unread update." : `You have ${f.unreadCount} unread updates.`,
      href: "/student/notifications?show=unread",
      action: "Read",
      icon: "info",
    });
  }
  return out.slice(0, 4);
}

/** The newest open application, for the "Your application" card. */
export function latestOpen<T extends { status: ApplicationStatus }>(apps: readonly T[]): T | null {
  return apps.find((a) => isOpen(a.status)) ?? null;
}
