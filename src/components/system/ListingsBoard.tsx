"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { moderateListingAction, type ModerationState } from "@/app/actions/moderation";
import { BedCounts } from "@/components/ui/BedCounts";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { BedCounts as Counts } from "@/lib/listings/beds";
import type { Badge } from "@/lib/listings/labels";
import { MODERATION_MOVE, MODERATION_NOTE_MAX, type ModerationMove } from "@/lib/listings/moderation";

export type SystemListingRow = {
  id: string;
  name: string;
  typeLabel: string;
  area: string;
  partner: string;
  moderation: Badge;
  verification: Badge;
  updatedText: string;
  beds: Counts;
  moves: ModerationMove[];
};

/** All listings, with Publish, Suspend and Return to moderation in one native <dialog>. */
export function ListingsBoard({ rows }: { rows: SystemListingRow[] }) {
  const [state, action] = useActionState<ModerationState, FormData>(moderateListingAction, { status: "idle" });
  const [target, setTarget] = useState<{ row: SystemListingRow; move: ModerationMove } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(row: SystemListingRow, move: ModerationMove, el: HTMLElement) {
    opener.current = el;
    setTarget({ row, move });
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const info = target ? MODERATION_MOVE[target.move] : null;
  const noteError = state.status === "error" ? state.fieldErrors?.note : undefined;

  return (
    <div className="stack">
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      <ul className="props">
        {rows.map((r) => (
          <li key={r.id}>
            <article className="prop" aria-labelledby={`sl-${r.id}`}>
              <div className="prop-h">
                <div>
                  <h2 id={`sl-${r.id}`} className="h3">
                    {r.name}
                  </h2>
                  <p className="muted small">
                    {r.typeLabel} · {r.area} · Partner: {r.partner} · {r.updatedText}
                  </p>
                </div>
                <div className="row">
                  <StatusPill {...r.moderation} />
                  <StatusPill {...r.verification} />
                </div>
              </div>
              <BedCounts counts={r.beds} label={`Beds at ${r.name} by state`} />
              {r.moves.length ? (
                <div className="row">
                  {r.moves.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-haspopup="dialog"
                      className={`btn sm${m === "publish" ? " primary" : m === "suspend" ? " danger" : ""}`}
                      onClick={(e) => open(r, m, e.currentTarget)}
                    >
                      {MODERATION_MOVE[m].label}
                      <span className="sr-only"> {r.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="mod-h"
        onClose={() => {
          setTarget(null);
          opener.current?.focus();
        }}
      >
        {target && info ? (
          <form action={action} key={`${target.row.id}-${target.move}`}>
            <input type="hidden" name="listing_id" value={target.row.id} />
            <input type="hidden" name="move" value={target.move} />
            <div className="dlg-h">
              <h2 id="mod-h">
                {info.title}
                <small className="dlg-sub">{target.row.name}</small>
              </h2>
              <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="dlg-b">
              {target.move === "publish" ? <p>Students can see the listing once it is published. The verification badge stays as it is. Not a guarantee.</p> : null}
              {target.move === "suspend" ? <p>Students can no longer see the listing. The owner is told and sees your reason.</p> : null}
              {target.move === "return" ? <p>The listing goes back to Awaiting moderation. You can then publish it.</p> : null}
              {target.move !== "return" ? (
                <div className="field">
                  <label htmlFor="mod-note">{info.note === "required" ? "Reason shown to the owner" : "Note to the owner (optional)"}</label>
                  <textarea
                    id="mod-note"
                    name="note"
                    rows={3}
                    maxLength={MODERATION_NOTE_MAX}
                    required={info.note === "required"}
                    aria-invalid={noteError ? true : undefined}
                    aria-describedby="mod-note-err"
                  />
                  <FieldError id="mod-note-err" message={noteError} />
                </div>
              ) : null}
              {state.status === "error" && state.message && !noteError ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
            </div>
            <div className="dlg-f">
              <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <SubmitButton className={target.move === "suspend" ? "btn danger solid" : "btn primary"} pendingText="Saving…">
                {info.label}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
