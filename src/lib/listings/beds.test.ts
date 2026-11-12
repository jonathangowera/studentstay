import { describe, expect, it } from "vitest";
import { addBedCounts, bookedBeds, countBeds, emptyBedCounts, totalBeds } from "./beds";
import { MODERATION_STATES, moderationBadge } from "./labels";
import { ticketMessage } from "@/lib/tickets/messages";

describe("bed counts", () => {
  it("counts each state and keeps zero for the rest", () => {
    const c = countBeds(["available", "available", "held", "occupied", "reserved", "blocked_for_maintenance", "nonsense"]);
    expect(c).toEqual({ available: 2, held: 1, pending_approval: 0, reserved: 1, occupied: 1, blocked_for_maintenance: 1 });
    expect(totalBeds(c)).toBe(6);
    expect(bookedBeds(c)).toBe(2);
  });
  it("adds counts of several properties", () => {
    const sum = addBedCounts(countBeds(["available"]), countBeds(["available", "occupied"]));
    expect(sum.available).toBe(2);
    expect(sum.occupied).toBe(1);
    expect(totalBeds(emptyBedCounts())).toBe(0);
  });
});

describe("moderationBadge", () => {
  it("has an icon and text for every state", () => {
    for (const m of MODERATION_STATES) {
      const b = moderationBadge(m);
      expect(b.icon).toBeTruthy();
      expect(b.label).not.toBe("Unknown");
    }
    expect(moderationBadge("awaiting_moderation").label).toBe("Awaiting moderation");
    expect(moderationBadge("whatever").label).toBe("Unknown");
  });
});

describe("ticketMessage", () => {
  it("maps the ticket codes to friendly text", () => {
    expect(ticketMessage("INVALID_TRANSITION")).toMatch(/not possible from the current status/);
    expect(ticketMessage("NOT_ALLOWED")).toBe("You can only update repair requests assigned to you.");
    expect(ticketMessage("TICKET_NOT_FOUND")).toBe("We could not find that repair request.");
    expect(ticketMessage("REOPEN_WINDOW_PASSED")).toBe("This request can no longer be reopened. Please report a new one.");
    expect(ticketMessage("UNKNOWN")).toBe("Something went wrong. Please try again.");
  });
});
