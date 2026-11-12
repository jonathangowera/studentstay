"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setTicketStatusAction, type TicketState } from "@/app/actions/tickets";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { NOTE_MAX, TICKET_MOVE, type TechnicianMove } from "@/lib/transitions";

const ICON = { in_progress: "clock", completed: "check-c", escalated: "alert" } as const;

/**
 * The technician's moves, each through one native <dialog>. Only the moves the server worked out from
 * state_transitions are shown; the action checks them again.
 */
export function TicketActions({ ticketId, reference, moves }: { ticketId: string; reference: string; moves: TechnicianMove[] }) {
  const [state, action] = useActionState<TicketState, FormData>(setTicketStatusAction, { status: "idle" });
  const [move, setMove] = useState<TechnicianMove | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(m: TechnicianMove, el: HTMLElement) {
    opener.current = el;
    setMove(m);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const info = move ? TICKET_MOVE[move] : null;

  return (
    <div className="stack">
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      {moves.length ? (
        <div className="stack-s">
          {moves.map((m, i) => (
            <button
              key={m}
              className={`btn block${i === 0 ? " primary" : m === "escalated" ? " danger" : ""}`}
              type="button"
              aria-haspopup="dialog"
              onClick={(e) => open(m, e.currentTarget)}
            >
              <Icon name={ICON[m]} />
              <span>{TICKET_MOVE[m].label}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">There is nothing for you to do on this request now.</p>
      )}

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="tm-h"
        onClose={() => {
          setMove(null);
          opener.current?.focus();
        }}
      >
        {move && info ? (
          <form action={action} key={move}>
            <input type="hidden" name="ticket_id" value={ticketId} />
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="to" value={move} />
            <div className="dlg-h">
              <h2 id="tm-h">{info.title}</h2>
              <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="dlg-b">
              <p>The tenant who reported {reference} is told about the change.</p>
              <div className="field">
                <label htmlFor="tm-note">{info.noteLabel}</label>
                <textarea
                  id="tm-note"
                  name="note"
                  rows={3}
                  maxLength={NOTE_MAX}
                  required={info.note === "required"}
                  aria-invalid={state.fieldErrors?.note ? true : undefined}
                  aria-describedby="tm-note-hint tm-note-err"
                />
                <p className="hint" id="tm-note-hint">
                  Up to {NOTE_MAX} characters. Shown on the timeline.
                </p>
                <FieldError id="tm-note-err" message={state.status === "error" ? state.fieldErrors?.note : undefined} />
              </div>
              {state.status === "error" && state.message && !state.fieldErrors?.note ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
            </div>
            <div className="dlg-f">
              <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <SubmitButton className={move === "escalated" ? "btn danger solid" : "btn primary"} pendingText="Saving…">
                {info.label}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
