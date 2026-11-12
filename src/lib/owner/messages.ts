/** What the owner sees when a decision on a private application stops. Pure and unit tested. */
import { MESSAGES } from "@/lib/errors";

const GENERIC = "Something went wrong. Please try again.";

export function ownerDecisionMessage(code: string): string {
  switch (code) {
    case "BED_UNAVAILABLE":
      return "That bed is no longer free. Nothing was saved. Choose another bed.";
    case "BED_REQUIRED":
      return "Choose the bed to hold.";
    case "ALREADY_DECIDED":
      return "This application has already been decided. Refresh the page to see its status.";
    case "NOTE_REQUIRED":
      return "Give a reason. The student sees it.";
    case "NOT_ALLOWED":
    case "42501":
      return "You can only decide applications sent to your own properties.";
    case "APPLICATION_NOT_FOUND":
      return "We could not find that application.";
    default:
      return MESSAGES[code] ?? GENERIC;
  }
}
