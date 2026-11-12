import { describe, expect, it } from "vitest";
import {
  TICKET_STATUSES,
  countBy,
  duePill,
  dueState,
  isOpenTicket,
  priorityPill,
  sortQueue,
  ticketStatusPill,
  ticketTimeline,
  type TicketPriority,
} from "./labels";

const BANNED = /\b(safe|secure|legal|guaranteed|genuine)\b/i;

describe("ticket pills", () => {
  it("gives every status an icon, a tone and a label", () => {
    for (const s of TICKET_STATUSES) {
      const p = ticketStatusPill(s);
      expect(p.icon).toBeTruthy();
      expect(p.tone).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.label).not.toMatch(BANNED);
      expect(p.label).not.toContain("—");
    }
    expect(ticketStatusPill("in_progress").label).toBe("In progress");
    expect(ticketStatusPill("pending").label).toBe("Waiting to be assigned");
  });

  it("labels priorities in words, with an icon", () => {
    expect(priorityPill("high")).toEqual({ tone: "bad", icon: "alert", label: "High priority" });
    expect(priorityPill("medium").label).toBe("Medium priority");
    expect(priorityPill("low").label).toBe("Low priority");
    expect(priorityPill("odd" as TicketPriority).label).toBe("Unknown priority");
  });

  it("knows which statuses are still open", () => {
    expect(isOpenTicket("reopened")).toBe(true);
    expect(isOpenTicket("completed")).toBe(false);
    expect(isOpenTicket("cancelled")).toBe(false);
  });
});

describe("sortQueue", () => {
  it("puts high priority first, then the earliest due time, then no due time", () => {
    const rows = [
      { reference: "TKT-1", priority: "low" as const, due_at: "2026-11-14T08:00:00Z" },
      { reference: "TKT-2", priority: "high" as const, due_at: "2026-11-15T08:00:00Z" },
      { reference: "TKT-3", priority: "high" as const, due_at: "2026-11-14T08:00:00Z" },
      { reference: "TKT-4", priority: "medium" as const, due_at: null },
      { reference: "TKT-5", priority: "medium" as const, due_at: "2026-11-20T08:00:00Z" },
      { reference: "TKT-10", priority: "low" as const, due_at: "2026-11-14T08:00:00Z" },
    ];
    expect(sortQueue(rows).map((r) => r.reference)).toEqual(["TKT-3", "TKT-2", "TKT-5", "TKT-4", "TKT-1", "TKT-10"]);
    expect(rows[0].reference).toBe("TKT-1"); // the input is not changed
  });
});

describe("dueState", () => {
  const now = new Date("2026-11-14T10:00:00Z");
  it("marks overdue and due within 24 hours", () => {
    expect(dueState("2026-11-14T09:59:00Z", "assigned", now)).toBe("overdue");
    expect(dueState("2026-11-15T10:00:00Z", "in_progress", now)).toBe("due_soon");
    expect(dueState("2026-11-15T10:01:00Z", "in_progress", now)).toBe("later");
  });
  it("ignores closed tickets and missing times", () => {
    expect(dueState("2026-11-01T00:00:00Z", "completed", now)).toBe("none");
    expect(dueState(null, "assigned", now)).toBe("none");
    expect(dueState("not a date", "assigned", now)).toBe("none");
  });
  it("gives a pill only when it needs attention", () => {
    expect(duePill("overdue")?.label).toBe("Overdue");
    expect(duePill("due_soon")?.label).toBe("Due soon");
    expect(duePill("later")).toBeNull();
  });
});

describe("countBy", () => {
  it("counts every key, starting at zero, and ignores unknown values", () => {
    expect(countBy(["a", "b", "a", "z"], ["a", "b", "c"] as const)).toEqual({ a: 2, b: 1, c: 0 });
  });
});

describe("ticketTimeline", () => {
  it("orders events and shows status, note and time only", () => {
    const items = ticketTimeline([
      { id: 2, from_status: "pending", to_status: "assigned", note: "Joseph will look", created_at: "2026-11-13T09:00:00Z" },
      { id: 1, from_status: null, to_status: "pending", note: null, created_at: "2026-11-13T08:00:00Z" },
    ]);
    expect(items).toEqual([
      { key: "1", label: "Reported (waiting to be assigned)", note: null, at: "2026-11-13T08:00:00Z", current: false },
      { key: "2", label: "Assigned", note: "Joseph will look", at: "2026-11-13T09:00:00Z", current: true },
    ]);
  });
});
