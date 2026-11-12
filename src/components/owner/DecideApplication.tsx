"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { decidePrivateApplicationAction, type OwnerDecisionState } from "@/app/actions/owner";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatKwacha, perUnit } from "@/lib/format";
import { ROOM_TYPE_LABEL, type RoomType } from "@/lib/listings/labels";
import { NOTE_MAX, type FreeBed, type OwnerDecision } from "@/lib/owner/decision";

/**
 * Accept (choose a free bed to hold for 48 hours) or Decline (reason required), each in a native <dialog>.
 * Escape closes it and focus goes back to the button. The server checks the role, the status and the bed again.
 */
export function DecideApplication({
  reference,
  applicationId,
  beds,
  requested,
  rentUnit,
}: {
  reference: string;
  applicationId: string;
  beds: FreeBed[];
  requested: RoomType | null;
  rentUnit: string;
}) {
  const [state, action] = useActionState<OwnerDecisionState, FormData>(decidePrivateApplicationAction, { status: "idle" });
  const [mode, setMode] = useState<OwnerDecision | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(m: OwnerDecision, el: HTMLElement) {
    opener.current = el;
    setMode(m);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const formError = state.status === "error" && state.message && !errors?.note && !errors?.bed_id ? state.message : null;

  return (
    <div className="stack">
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      <div className="stack-s">
        <button className="btn primary block" type="button" aria-haspopup="dialog" disabled={!beds.length} onClick={(e) => open("accepted", e.currentTarget)}>
          <Icon name="check-c" />
          <span>Accept and hold a bed</span>
        </button>
        {!beds.length ? <p className="hint">There is no free bed in this property, so you cannot accept now. You can decline with a reason.</p> : null}
        <button className="btn danger block" type="button" aria-haspopup="dialog" onClick={(e) => open("declined", e.currentTarget)}>
          <Icon name="x-c" />
          <span>Decline and add a reason</span>
        </button>
      </div>

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="od-h"
        onClose={() => {
          setMode(null);
          opener.current?.focus();
        }}
      >
        {mode ? (
          <form action={action} key={mode}>
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="application_id" value={applicationId} />
            <input type="hidden" name="decision" value={mode} />
            <div className="dlg-h">
              <h2 id="od-h">{mode === "accepted" ? `Accept ${reference}?` : `Decline ${reference}?`}</h2>
              <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="dlg-b">
              {mode === "accepted" ? (
                <>
                  <p>The bed you choose is held for 48 hours. The student must then pay the demonstration deposit to confirm it.</p>
                  <fieldset className="bed-pick" aria-describedby="od-bed-err">
                    <legend>Choose a free bed</legend>
                    <ul>
                      {beds.map((b, i) => (
                        <li key={b.id}>
                          <label className="opt">
                            <input type="radio" name="bed_id" value={b.id} required defaultChecked={i === 0} />
                            <span>
                              <b>
                                Room {b.roomNumber}, bed {b.label}
                              </b>
                              <small>
                                {ROOM_TYPE_LABEL[b.roomType]} room, {formatKwacha(b.price)} {perUnit(rentUnit)}
                                {b.roomType === requested ? " · Requested room type" : ""}
                              </small>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <FieldError id="od-bed-err" message={errors?.bed_id} />
                  </fieldset>
                  <p className="hint">Availability is checked again when you accept. If the bed has just been taken, nothing changes.</p>
                </>
              ) : (
                <p>The student is told and sees your reason.</p>
              )}
              <div className="field">
                <label htmlFor="od-note">{mode === "accepted" ? "Message to the student (optional)" : "Reason shown to the student"}</label>
                <textarea
                  id="od-note"
                  name="note"
                  rows={3}
                  maxLength={NOTE_MAX}
                  required={mode === "declined"}
                  aria-invalid={errors?.note ? true : undefined}
                  aria-describedby="od-note-err"
                />
                <FieldError id="od-note-err" message={errors?.note} />
              </div>
              {formError ? <ErrorNotice message={formError} reference={state.errorRef} /> : null}
            </div>
            <div className="dlg-f">
              <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <SubmitButton className={mode === "declined" ? "btn danger solid" : "btn primary"} pendingText="Saving…">
                {mode === "accepted" ? "Accept and hold the bed" : "Decline and notify"}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
