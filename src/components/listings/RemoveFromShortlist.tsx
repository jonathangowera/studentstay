"use client";

import { useActionState } from "react";
import { removeFromShortlist } from "@/app/actions/shortlist";
import { IDLE } from "@/lib/form-state";
import { ErrorNotice } from "@/components/ui/Callout";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";

/** Works without JavaScript: a small form that posts to the Server Function. */
export function RemoveFromShortlist({ listingId, name }: { listingId: string; name: string }) {
  const [state, action] = useActionState(removeFromShortlist, IDLE);
  return (
    <form action={action} style={{ display: "grid", gap: ".4rem" }}>
      <input type="hidden" name="listing_id" value={listingId} />
      {state.status === "error" && state.message ? <ErrorNotice message={state.message} reference={state.reference} /> : null}
      <SubmitButton className="btn sm ghost" pendingText="Removing…">
        <Icon name="trash" />
        Remove<span className="sr-only"> {name} from your shortlist</span>
      </SubmitButton>
    </form>
  );
}
