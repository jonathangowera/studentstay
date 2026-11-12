/**
 * What the student sees when the apply wizard or withdraw stops. Pure and unit tested.
 * Codes come from src/server/apply.ts (app checks) or from the database through src/lib/errors.ts.
 */
import { MESSAGES } from "@/lib/errors";

export type Notice = { message: string; link?: { href: string; label: string } };

const view = (reference: string) => ({ href: `/student/applications/${reference}`, label: "View your application" });

export function applyNotice(code: string, reference?: string): Notice {
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return { message: "Verify your email before applying. Open the link we sent you, then come back." };
    case "CONTINUE_APPLICATION":
      return {
        message: "You have a university allocation application that is not finished yet.",
        link: reference ? { href: `/apply?application=${reference}`, label: "Continue your application" } : undefined,
      };
    case "UNIVERSITY_APPLICATION_OPEN":
      return { message: MESSAGES.UNIVERSITY_APPLICATION_OPEN, link: reference ? view(reference) : undefined };
    case "DUPLICATE_APPLICATION":
      return { message: MESSAGES.DUPLICATE_APPLICATION, link: reference ? view(reference) : { href: "/student/applications", label: "See your applications" } };
    case "PLACE_NOT_FOUND":
      return { message: "This place is not open for applications. Choose another place.", link: { href: "/listings", label: "Find a home" } };
    case "NOT_FOUND":
      return { message: "We could not find that application.", link: { href: "/student/applications", label: "See your applications" } };
    case "NOT_EDITABLE":
      return { message: "This application can no longer be edited.", link: reference ? view(reference) : undefined };
    case "STUDENT_NUMBER_TAKEN":
      return { message: MESSAGES.STUDENT_NUMBER_TAKEN };
    default: {
      const message = MESSAGES[code] ?? "Something went wrong. Please try again.";
      // A draft was saved before the failure: the student can continue it.
      return reference
        ? { message: `${message} Your application was saved as a draft.`, link: { href: `/apply?application=${reference}`, label: "Continue your application" } }
        : { message };
    }
  }
}

export function withdrawNotice(code: string): Notice {
  if (code === "WITHDRAW_NOT_ALLOWED" || code === "INVALID_TRANSITION") return { message: MESSAGES.WITHDRAW_NOT_ALLOWED };
  if (code === "NOT_FOUND") return { message: "We could not find that application." };
  return { message: MESSAGES[code] ?? "Something went wrong. Please try again." };
}
