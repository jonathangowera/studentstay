"use client";

import { useActionState, useEffect, useRef } from "react";
import { reopenRepairAction, type RepairState } from "@/app/actions/repairs";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LIMITS } from "@/lib/tickets/validation";

/** Reopen a completed repair request, in a native <dialog>. The note is optional. */
export function ReopenButton({ reference, until }: { reference: string; until: string }) {
  const [state, action] = useActionState<RepairState, FormData>(reopenRepairAction, { status: "idle" });
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const id = reference.toLowerCase();

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  if (state.status === "success" && state.message) return <Callout tone="ok" title={state.message} role="status" />;

  return (
    <div className="stack-s">
      <button ref={opener} className="btn sm" type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <Icon name="alert" />
        <span>
          Reopen<span className="sr-only"> {reference}</span>
        </span>
      </button>
      <p className="hint">You can reopen it until {until}.</p>
      <dialog ref={dialog} className="dlg" aria-labelledby={`ro-${id}-h`} onClose={() => opener.current?.focus()}>
        <form action={action}>
          <input type="hidden" name="reference" value={reference} />
          <div className="dlg-h">
            <h2 id={`ro-${id}-h`}>Reopen {reference}?</h2>
            <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="dlg-b">
            <p>Reopen it if the problem is not fixed. The owner and technician see it again.</p>
            <div className="field">
              <label htmlFor={`ro-${id}-note`}>What is still wrong? (optional)</label>
              <textarea id={`ro-${id}-note`} name="note" rows={3} maxLength={LIMITS.note} />
            </div>
            {state.status === "error" && state.message ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
          </div>
          <div className="dlg-f">
            <button className="btn" type="button" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <SubmitButton pendingText="Reopening…">Reopen request</SubmitButton>
          </div>
        </form>
      </dialog>
    </div>
  );
}
