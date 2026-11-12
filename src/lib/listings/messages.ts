/** The owner's wording for availability, bed and price changes. Pure and unit tested. */
import { MESSAGES } from "@/lib/errors";

export function listingMessage(code: string): string {
  switch (code) {
    case "INVALID_TRANSITION":
      return "That change is not possible from the bed's current state. Refresh the page to see the latest state.";
    case "STATE_CHANGED":
      return "This bed changed while you were looking. Refresh the page and try again.";
    case "NOT_ALLOWED":
    case "42501":
      return "You can only change your own properties.";
    case "23514":
      return "That price is not valid.";
    default:
      return MESSAGES[code] ?? "Something went wrong. Please try again.";
  }
}
