"use client";

import { useActionState } from "react";
import { confirmAvailabilityAction, type ListingState } from "@/app/actions/listings";
import { ErrorNotice } from "@/components/ui/Callout";
import { SubmitButton } from "@/components/ui/SubmitButton";

/** "Confirm availability" refreshes the listing's last-updated time through confirm_listing_availability. */
export function ConfirmAvailability({ listingId, name }: { listingId: string; name: string }) {
  const [state, action] = useActionState<ListingState, FormData>(confirmAvailabilityAction, { status: "idle" });
  return (
    <form action={action} className="stack-s">
      <input type="hidden" name="listing_id" value={listingId} />
      <SubmitButton className="btn sm" pendingText="Confirming…">
        Confirm availability<span className="sr-only"> of {name}</span>
      </SubmitButton>
      <p className="hint" role="status">
        {state.status === "success" ? state.message : ""}
      </p>
      {state.status === "error" && state.message ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
    </form>
  );
}
