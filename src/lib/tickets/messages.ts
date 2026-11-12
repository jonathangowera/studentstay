/** What a person sees when a repair request change stops. Pure and unit tested. */
import { MESSAGES } from "@/lib/errors";

const GENERIC = "Something went wrong. Please try again.";

export function ticketMessage(code: string): string {
  switch (code) {
    case "INVALID_TRANSITION":
      return "That change is not possible from the current status. Refresh the page to see the latest status.";
    case "NOT_ALLOWED":
    case "42501":
      return "You can only update repair requests assigned to you.";
    case "TICKET_NOT_FOUND":
      return "We could not find that repair request.";
    case "NOTE_REQUIRED":
      return "Please add a note.";
    case "REOPEN_WINDOW_PASSED":
      return MESSAGES.REOPEN_WINDOW_PASSED;
    default:
      return MESSAGES[code] ?? GENERIC;
  }
}
