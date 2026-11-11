"use client";

import { useActionState, useRef } from "react";
import { withdrawApplication, type WithdrawState } from "@/app/actions/applications";
import { Callout } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Withdraw with a native <dialog>: Escape closes it, focus stays inside while open, and focus goes back to the
 * Withdraw button afterwards. The server checks the role and the allowed status change again.
 */
export function WithdrawDialog({ reference, route }: { reference: string; route: "university_allocation" | "private" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [state, action] = useActionState<WithdrawState, FormData>(withdrawApplication, { status: "idle" });

  const close = () => dialog.current?.close();

  return (
    <>
      <button ref={opener} className="btn danger" type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <Icon name="x-c" />
        <span>Withdraw application</span>
      </button>
      <dialog ref={dialog} className="dlg" aria-labelledby="wd-h" aria-describedby="wd-d" onClose={() => opener.current?.focus()}>
        <form action={action}>
          <input type="hidden" name="reference" value={reference} />
          <div className="dlg-h">
            <h2 id="wd-h">Withdraw application {reference}?</h2>
            <button className="btn ghost sm icon" type="button" onClick={close} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="dlg-b">
            <p id="wd-d">
              {route === "university_allocation"
                ? "Any room recommended or approved for you will be released for someone else. You cannot undo this."
                : "Any bed the owner set aside for you will be released. You cannot undo this."}
            </p>
            <div className="field">
              <label htmlFor="wd-reason">Reason (optional)</label>
              <textarea id="wd-reason" name="reason" rows={3} maxLength={500} />
              <p className="hint">Up to 500 characters. Saved with your application.</p>
            </div>
            {state.status === "error" && state.message ? (
              <Callout tone="bad" title={state.message} role="alert">
                {state.errorRef ? (
                  <>
                    Reference code <span className="ref">{state.errorRef}</span>
                  </>
                ) : null}
              </Callout>
            ) : null}
          </div>
          <div className="dlg-f">
            <button className="btn" type="button" onClick={close}>
              Keep my application
            </button>
            <SubmitButton className="btn danger solid" pendingText="Withdrawing…">
              Withdraw application
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
