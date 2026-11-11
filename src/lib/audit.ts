/** Helpers for the read-only audit log page. Pure functions, easy to test. */

export const AUDIT_PAGE_SIZE = 25;

const RECORD_LABEL: Record<string, string> = {
  applications: "Application",
  beds: "Bed",
  bookings: "Booking",
  payments: "Payment",
  maintenance_tickets: "Repair request",
  listings: "Listing",
  documents: "Document",
  allocation_rules: "Allocation rules",
  allocation_runs: "Allocation run",
  allocation: "Allocation",
  announcements: "Announcement",
  announcement: "Announcement",
  profiles: "Profile",
  partners: "Business",
};

const COLUMN_LABEL: Record<string, string> = {
  status: "status",
  state: "state",
  moderation: "moderation",
  review_decision: "review",
  active: "active setting",
  role: "role",
};

export function recordLabel(type: string | null): string {
  if (!type) return "Record";
  return RECORD_LABEL[type] ?? sentence(type.replace(/_/g, " "));
}

function sentence(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "applications.status_changed" becomes "Application status changed". */
export function actionLabel(action: string): string {
  const [type, verb = ""] = action.split(".", 2);
  const subject = recordLabel(type);
  if (verb === "created") return `${subject} created`;
  if (verb === "decision") return `${subject} decided`;
  if (verb === "sent") return `${subject} sent`;
  const changed = /^(.+)_changed$/.exec(verb);
  if (changed) return `${subject} ${COLUMN_LABEL[changed[1]] ?? changed[1].replace(/_/g, " ")} changed`;
  return sentence(action.replace(/[._]/g, " "));
}

/** First block of a UUID is enough to tell records apart on screen. */
export function shortId(id: string | null): string {
  if (!id) return "";
  return /^[0-9a-f]{8}-/i.test(id) ? id.slice(0, 8) : id;
}

/** Reads ?page= safely. Anything odd becomes page 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

export function pageRange(page: number, size = AUDIT_PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size = AUDIT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

const CAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lusaka",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Times show Central Africa Time. */
export function formatCat(iso: string): string {
  return `${CAT.format(new Date(iso))} CAT`;
}
