/**
 * Labels, pills and ordering for repair requests (maintenance_tickets). Pure and unit tested.
 * Status is never colour alone: every pill has an icon and a text label.
 */
import type { Database } from "@/lib/database.types";
import type { IconName } from "@/components/ui/Icon";
import type { Tone } from "@/components/ui/StatusPill";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

type Pill = { tone: Tone; icon: IconName; label: string };

export const TICKET_STATUSES: readonly TicketStatus[] = ["pending", "assigned", "in_progress", "reopened", "escalated", "completed", "cancelled"];

const STATUS_PILL: Record<TicketStatus, Pill> = {
  pending: { tone: "warn", icon: "clock", label: "Waiting to be assigned" },
  assigned: { tone: "info", icon: "user", label: "Assigned" },
  in_progress: { tone: "info", icon: "clock", label: "In progress" },
  reopened: { tone: "warn", icon: "alert", label: "Reopened" },
  escalated: { tone: "bad", icon: "alert", label: "Escalated" },
  completed: { tone: "ok", icon: "check-c", label: "Completed" },
  cancelled: { tone: "mute", icon: "x", label: "Cancelled" },
};

const PRIORITY_PILL: Record<TicketPriority, Pill> = {
  high: { tone: "bad", icon: "alert", label: "High priority" },
  medium: { tone: "warn", icon: "clock", label: "Medium priority" },
  low: { tone: "mute", icon: "circle", label: "Low priority" },
};

export function ticketStatusPill(status: TicketStatus): Pill {
  return STATUS_PILL[status] ?? { tone: "mute", icon: "circle", label: "Unknown" };
}

export function priorityPill(priority: TicketPriority): Pill {
  return PRIORITY_PILL[priority] ?? { tone: "mute", icon: "circle", label: "Unknown priority" };
}

export const TICKET_CATEGORIES = ["Plumbing", "Electrical", "Security", "Internet", "Other"] as const;

/** Statuses where work is still to be done. */
export const OPEN_TICKET_STATUSES: readonly TicketStatus[] = ["pending", "assigned", "in_progress", "reopened", "escalated"];

export function isOpenTicket(status: TicketStatus): boolean {
  return OPEN_TICKET_STATUSES.includes(status);
}

const PRIORITY_RANK: Record<TicketPriority, number> = { high: 0, medium: 1, low: 2 };

type Sortable = { priority: TicketPriority; due_at: string | null; reference: string };

/** High priority first, then the earliest due time (no due time last), then the reference. */
export function sortQueue<T extends Sortable>(tickets: readonly T[]): T[] {
  return [...tickets].sort((a, b) => {
    const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (p) return p;
    if (a.due_at !== b.due_at) {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return Date.parse(a.due_at) - Date.parse(b.due_at);
    }
    return a.reference.localeCompare(b.reference, "en", { numeric: true });
  });
}

export type DueState = "overdue" | "due_soon" | "later" | "none";

/** Due soon means within the next 24 hours. Closed tickets and tickets without a due time are "none". */
export function dueState(dueAt: string | null, status: TicketStatus, now: Date = new Date()): DueState {
  if (!dueAt || !isOpenTicket(status)) return "none";
  const ms = Date.parse(dueAt) - now.getTime();
  if (Number.isNaN(ms)) return "none";
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "due_soon";
  return "later";
}

export function duePill(state: DueState): Pill | null {
  if (state === "overdue") return { tone: "bad", icon: "alert", label: "Overdue" };
  if (state === "due_soon") return { tone: "warn", icon: "clock", label: "Due soon" };
  return null;
}

/** How many items have each value. Every key starts at 0 so a missing state still shows. */
export function countBy<K extends string>(values: readonly string[], keys: readonly K[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const v of values) if ((keys as readonly string[]).includes(v)) out[v as K] += 1;
  return out;
}

export type TicketEventRow = { id: number; from_status: TicketStatus | null; to_status: TicketStatus; note: string | null; created_at: string };

export type TicketTimelineItem = { key: string; label: string; note: string | null; at: string; current: boolean };

/** Ticket timeline: status, note and time only. Who made the change is not shown (row-level security hides other people). */
export function ticketTimeline(events: readonly TicketEventRow[]): TicketTimelineItem[] {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  return sorted.map((e, i) => ({
    key: String(e.id),
    label: e.from_status ? ticketStatusPill(e.to_status).label : `Reported (${ticketStatusPill(e.to_status).label.toLowerCase()})`,
    note: e.note,
    at: e.created_at,
    current: i === sorted.length - 1,
  }));
}
