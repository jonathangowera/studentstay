/**
 * What the administrator sees when matching or a decision stops. The same code can mean different things in each
 * context (BED_UNAVAILABLE while matching vs. while approving). Pure and unit tested.
 */
import { MESSAGES } from "@/lib/errors";

const GENERIC = "Something went wrong. Please try again.";

export function matchMessage(code: string): string {
  switch (code) {
    case "INVALID_TRANSITION":
    case "NOT_SUBMITTED":
      return "Only a submitted application can be matched. It may have been matched already. Refresh the page.";
    case "BED_UNAVAILABLE":
      return "A bed was taken while matching, so nothing was saved. Run matching again.";
    case "NOT_ALLOWED":
    case "42501":
      return "You can only match applications of your own institution.";
    default:
      return MESSAGES[code] ?? GENERIC;
  }
}

export function decideMessage(code: string): string {
  switch (code) {
    case "NOTE_REQUIRED":
      return "Please give a reason. A note is needed to change or reject a recommendation.";
    case "BED_REQUIRED":
      return "Choose the room to approve instead.";
    case "BED_NOT_ELIGIBLE":
      return "Choose one of the eligible rooms from this run.";
    case "BED_UNAVAILABLE":
      return "That bed was just taken. Nothing was saved.";
    case "ALREADY_DECIDED":
      return "This recommendation has already been decided. Refresh the page to see the decision.";
    case "NOT_ALLOWED":
    case "42501":
      return "You can only decide applications of your own institution.";
    case "RUN_NOT_FOUND":
      return "We could not find that recommendation. Refresh the page.";
    default:
      return MESSAGES[code] ?? GENERIC;
  }
}
