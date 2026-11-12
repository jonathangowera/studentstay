import { describe, expect, it } from "vitest";
import { decideMessage, matchMessage } from "./messages";
import { extractErrorCode, toFriendlyError } from "@/lib/errors";

describe("allocation error mapping", () => {
  it("matches database errors by the code before the colon", () => {
    for (const code of ["RULE_NOT_ACTIVE", "BED_UNAVAILABLE", "INVALID_TRANSITION", "NOT_UNIVERSITY", "NOTE_REQUIRED", "BED_NOT_ELIGIBLE", "ALREADY_DECIDED"]) {
      expect(extractErrorCode({ code: "P0001", message: `${code}: some detail` })).toBe(code);
    }
    expect(extractErrorCode({ code: "42501", message: "NOT_ALLOWED: the person who ran the matching is not an administrator" })).toBe("NOT_ALLOWED");
  });

  it("has general messages for the new codes", () => {
    expect(toFriendlyError({ message: "RULE_NOT_ACTIVE: x" }).message).toBe("There is no active allocation rule for your institution.");
    expect(toFriendlyError({ message: "NOT_UNIVERSITY: x" }).message).toBe("Only university allocation applications can be matched.");
    expect(toFriendlyError({ code: "P0002", message: "APPLICATION_NOT_FOUND" }).message).toBe("We could not find that application.");
    expect(extractErrorCode({ code: "42501", message: "NOT_ALLOWED" })).toBe("NOT_ALLOWED");
    expect(extractErrorCode({ code: "42501", message: "NOT ALLOWED here" })).toBe("42501");
    expect(toFriendlyError({ message: "BAD_INPUT: too many" }).message).toBe("Something went wrong. Please try again.");
  });

  it("words BED_UNAVAILABLE for each context", () => {
    expect(matchMessage("BED_UNAVAILABLE")).toBe("A bed was taken while matching, so nothing was saved. Run matching again.");
    expect(decideMessage("BED_UNAVAILABLE")).toBe("That bed was just taken. Nothing was saved.");
  });

  it("explains matching refusals", () => {
    expect(matchMessage("INVALID_TRANSITION")).toMatch(/^Only a submitted application can be matched/);
    expect(matchMessage("NOT_SUBMITTED")).toBe(matchMessage("INVALID_TRANSITION"));
    expect(matchMessage("RULE_NOT_ACTIVE")).toBe("There is no active allocation rule for your institution.");
    expect(matchMessage("NOT_ALLOWED")).toBe("You can only match applications of your own institution.");
    expect(matchMessage("APPLICATION_INCOMPLETE")).toMatch(/missing a room type, budget or who can stay/);
  });

  it("explains decision refusals", () => {
    expect(decideMessage("NOTE_REQUIRED")).toMatch(/^Please give a reason/);
    expect(decideMessage("BED_NOT_ELIGIBLE")).toBe("Choose one of the eligible rooms from this run.");
    expect(decideMessage("ALREADY_DECIDED")).toMatch(/already been decided/);
    expect(decideMessage("WHATEVER")).toBe("Something went wrong. Please try again.");
  });

  it("never calls a recommendation approved or allocated in a refusal", () => {
    for (const c of ["INVALID_TRANSITION", "BED_UNAVAILABLE", "RULE_NOT_ACTIVE", "NOT_ALLOWED"]) {
      expect(matchMessage(c)).not.toMatch(/approved|allocated/i);
    }
  });
});
