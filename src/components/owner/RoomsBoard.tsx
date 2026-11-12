"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changeBedStateAction, changeRoomPriceAction, type ListingState } from "@/app/actions/listings";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BED_NOTE_MAX } from "@/lib/listings/beds";
import { bedStateInfo, ROOM_TYPE_LABEL, type BedState, type RoomType } from "@/lib/listings/labels";

export type BoardBed = { id: string; label: string; state: BedState; note: string | null; changedText: string; moves: { to: BedState; label: string }[] };
export type BoardRoom = { id: string; number: string; type: RoomType; price: number; wing: string | null; beds: BoardBed[] };

const TONE: Record<BedState, "ok" | "warn" | "info" | "mute" | "bad"> = {
  available: "ok",
  held: "warn",
  pending_approval: "info",
  reserved: "info",
  occupied: "mute",
  blocked_for_maintenance: "bad",
};

function BedPill({ state }: { state: BedState }) {
  const b = bedStateInfo(state);
  return <StatusPill tone={TONE[state]} icon={b.icon} label={b.label} />;
}

function PriceForm({ listingId, room, unitLabel }: { listingId: string; room: BoardRoom; unitLabel: string }) {
  const [state, action] = useActionState<ListingState, FormData>(changeRoomPriceAction, { status: "idle" });
  const id = `price-${room.id}`;
  return (
    <form action={action} className="price-form">
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="room_id" value={room.id} />
      <div className="field">
        <label htmlFor={id}>
          Price {unitLabel} (K)<span className="sr-only">, room {room.number}</span>
        </label>
        <div className="row nowrap">
          <input
            id={id}
            name="price"
            inputMode="decimal"
            defaultValue={String(room.price)}
            required
            aria-invalid={state.status === "error" ? true : undefined}
            aria-describedby={`${id}-msg`}
          />
          <SubmitButton className="btn sm" pendingText="Saving…">
            Save<span className="sr-only"> price for room {room.number}</span>
          </SubmitButton>
        </div>
        <span id={`${id}-msg`} role="status" className={state.status === "error" ? "field-error" : "hint"}>
          {state.status === "error" ? <>{state.message}{state.errorRef ? ` Reference ${state.errorRef}.` : ""}</> : state.status === "success" ? state.message : ""}
        </span>
      </div>
    </form>
  );
}

/**
 * Rooms with their beds. Each bed offers only the moves the server worked out (the agreed list narrowed by
 * state_transitions), through one native <dialog>. Held and pending approval beds say "Set by an application".
 */
export function RoomsBoard({ listingId, rooms, unitLabel }: { listingId: string; rooms: BoardRoom[]; unitLabel: string }) {
  const [state, action] = useActionState<ListingState, FormData>(changeBedStateAction, { status: "idle" });
  const [target, setTarget] = useState<{ room: BoardRoom; bed: BoardBed } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(room: BoardRoom, bed: BoardBed, el: HTMLElement) {
    opener.current = el;
    setTarget({ room, bed });
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  return (
    <div className="stack">
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      <ul className="rooms">
        {rooms.map((room) => (
          <li key={room.id}>
            <section aria-labelledby={`room-${room.id}`} className="room-card">
              <div className="prop-h">
                <div>
                  <h3 id={`room-${room.id}`}>Room {room.number}</h3>
                  <p className="muted">
                    {ROOM_TYPE_LABEL[room.type]} room{room.wing ? ` · ${room.wing}` : ""}
                  </p>
                </div>
                <PriceForm listingId={listingId} room={room} unitLabel={unitLabel} />
              </div>
              <ul className="beds">
                {room.beds.map((bed) => (
                  <li key={bed.id}>
                    <div className="grow">
                      <b>Bed {bed.label}</b>
                      <BedPill state={bed.state} />
                      <small>
                        {bed.changedText}
                        {bed.note ? ` · ${bed.note}` : ""}
                      </small>
                    </div>
                    {bed.moves.length ? (
                      <button className="btn sm soft" type="button" aria-haspopup="dialog" onClick={(e) => open(room, bed, e.currentTarget)}>
                        Change state<span className="sr-only"> of room {room.number} bed {bed.label}</span>
                      </button>
                    ) : bed.state === "held" || bed.state === "pending_approval" ? (
                      <span className="muted small">Set by an application</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="bs-h"
        onClose={() => {
          setTarget(null);
          opener.current?.focus();
        }}
      >
        {target ? (
          <form action={action} key={target.bed.id}>
            <input type="hidden" name="listing_id" value={listingId} />
            <input type="hidden" name="bed_id" value={target.bed.id} />
            <div className="dlg-h">
              <h2 id="bs-h">
                Change bed state
                <small className="dlg-sub">
                  Room {target.room.number}, bed {target.bed.label}. Now: {bedStateInfo(target.bed.state).label}.
                </small>
              </h2>
              <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="dlg-b">
              <fieldset className="field">
                <legend>New state</legend>
                <div className="stack-s">
                  {target.bed.moves.map((m, i) => (
                    <label className="opt" key={m.to}>
                      <input type="radio" name="to" value={m.to} required defaultChecked={i === 0} />
                      <span>
                        <b>{m.label}</b>
                        <small>Becomes {bedStateInfo(m.to).label}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="bs-note">Note (optional)</label>
                <textarea id="bs-note" name="note" rows={2} maxLength={BED_NOTE_MAX} aria-describedby="bs-note-err" />
                <FieldError id="bs-note-err" message={state.status === "error" ? state.fieldErrors?.note : undefined} />
              </div>
              {state.status === "error" && state.message && !state.fieldErrors?.note ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
            </div>
            <div className="dlg-f">
              <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <SubmitButton pendingText="Saving…">Save change</SubmitButton>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
