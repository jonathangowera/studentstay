import { describe, expect, it } from "vitest";
import { moderationMessage, moderationMoves, parseModeration } from "./moderation";

const ROWS = [
  ["draft", "awaiting_moderation"],
  ["awaiting_moderation", "published"],
  ["awaiting_moderation", "requires_review"],
  ["awaiting_moderation", "suspended"],
  ["requires_review", "awaiting_moderation"],
  ["requires_review", "suspended"],
  ["published", "requires_review"],
  ["published", "suspended"],
  ["suspended", "awaiting_moderation"],
].map(([from_state, to_state]) => ({ machine: "listing", from_state, to_state }));

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const L = "11111111-1111-4111-8111-111111111111";

describe("moderationMoves", () => {
  it("offers Publish only on a listing awaiting moderation", () => {
    expect(moderationMoves(ROWS, "awaiting_moderation")).toEqual(["publish", "suspend"]);
    for (const s of ["draft", "published", "requires_review", "suspended"] as const) expect(moderationMoves(ROWS, s)).not.toContain("publish");
  });
  it("offers Return to moderation on suspended and requires review", () => {
    expect(moderationMoves(ROWS, "suspended")).toEqual(["return"]);
    expect(moderationMoves(ROWS, "requires_review")).toEqual(["return", "suspend"]);
  });
  it("offers Suspend on a published listing, and nothing on a draft", () => {
    expect(moderationMoves(ROWS, "published")).toEqual(["suspend"]);
    expect(moderationMoves(ROWS, "draft")).toEqual([]);
  });
  it("follows the table", () => {
    expect(moderationMoves([], "awaiting_moderation")).toEqual([]);
  });
});

describe("parseModeration", () => {
  it("needs a reason to suspend", () => {
    expect(parseModeration(form({ listing_id: L, move: "suspend" }))).toEqual({ ok: false, errors: { note: "Give a reason. The owner sees it." } });
    expect(parseModeration(form({ listing_id: L, move: "suspend", note: "Photos do not match" })).ok).toBe(true);
  });
  it("makes the note optional to publish or return", () => {
    expect(parseModeration(form({ listing_id: L, move: "publish" }))).toEqual({ ok: true, data: { listingId: L, move: "publish", note: null } });
    expect(parseModeration(form({ listing_id: L, move: "return" })).ok).toBe(true);
  });
  it("refuses unknown moves and bad ids", () => {
    expect(parseModeration(form({ listing_id: L, move: "delete" })).ok).toBe(false);
    expect(parseModeration(form({ listing_id: L, move: "toString" })).ok).toBe(false);
    expect(parseModeration(form({ listing_id: "x", move: "publish" })).ok).toBe(false);
  });
});

describe("moderationMessage", () => {
  it("words the moderation codes", () => {
    expect(moderationMessage("INVALID_TRANSITION")).toMatch(/current state/);
    expect(moderationMessage("NOTE_REQUIRED")).toBe("Give a reason. The owner sees it.");
    expect(moderationMessage("NOT_ALLOWED")).toBe("Only a system administrator can do that.");
  });
});
