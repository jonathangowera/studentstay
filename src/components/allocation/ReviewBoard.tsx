"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { decideAllocationAction, type AllocationState } from "@/app/actions/allocation";
import { ScoreBars } from "@/components/applications/ApplicationBits";
import { Callout } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatKwacha } from "@/lib/format";
import { monthlyPrice } from "@/lib/allocation/engine";
import { placeLine } from "@/lib/allocation/labels";
import { ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import type { CandidateView } from "@/server/admin";
import { Result } from "./RunMatching";

type Mode = "approved" | "modified" | "rejected" | "rerun" | "conflict";

const CONFLICT_NOTE = "The recommended bed was taken before approval. Approved the next eligible room instead.";

function priceText(c: CandidateView): string {
  const monthly = Math.round(monthlyPrice(c.price, c.rentUnit));
  return c.rentUnit === "term" ? `about ${formatKwacha(monthly)} a month (${formatKwacha(c.price)} a term)` : `${formatKwacha(monthly)} a month`;
}

/**
 * Ranked candidates and the decision panel. Every decision goes through a native <dialog> (Escape closes it,
 * focus returns to the button) and the decideAllocationAction server action, with the administrator's own session.
 */
export function ReviewBoard({
  reference,
  runId,
  candidates,
  canDecide,
}: {
  reference: string;
  runId: string;
  candidates: CandidateView[];
  canDecide: boolean;
}) {
  const [state, action] = useActionState<AllocationState, FormData>(decideAllocationAction, { status: "idle" });
  const [mode, setMode] = useState<Mode | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [conflictNote, setConflictNote] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const top = candidates[0];
  const chosenCand = candidates.find((c) => c.bedId === chosen) ?? null;

  // A reply from the server: a bed taken during approval opens the conflict view; success closes the dialog.
  const [reply, setReply] = useState(state);
  if (reply !== state) {
    setReply(state);
    if (state.status === "error" && state.code === "BED_UNAVAILABLE" && (mode === "approved" || mode === "modified")) setMode("conflict");
  }
  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(m: Mode, el: HTMLElement | null) {
    opener.current = el;
    setMode(m);
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const titles: Record<Mode, string> = {
    approved: "Approve the recommended room?",
    modified: "Approve a different room?",
    rejected: "Reject this recommendation?",
    rerun: "Match again?",
    conflict: "That bed was just taken",
  };

  return (
    <>
      <h2 className="sec">Ranked candidates</h2>
      {candidates.map((c) => {
        const isTop = c === top;
        return (
          <article key={c.id} className={`cand${isTop ? " top" : ""}${c.bedId && c.bedId === chosen ? " chosen" : ""}`} aria-labelledby={`cand-${c.id}`}>
            <div className="cand-h">
              <span className="cand-rank" aria-label={`Rank ${c.rank}`}>
                {c.rank}
              </span>
              <div className="grow">
                <h3 id={`cand-${c.id}`}>{placeLine(c)}</h3>
                <p className="muted" style={{ fontSize: ".8125rem" }}>
                  {ROOM_TYPE_LABEL[c.roomType]} room, {priceText(c)}
                  {isTop ? " · Recommended" : ""}
                </p>
              </div>
              <div className="cand-s">
                <b>{c.scores?.total.toFixed(2)}</b>
                <small>of 100</small>
              </div>
            </div>
            <div className="cand-b">
              {c.scores ? <ScoreBars scores={c.scores} /> : null}
              {c.explanation ? <p className="muted" style={{ fontSize: ".8125rem" }}>{c.explanation}</p> : null}
              {canDecide && !isTop && c.bedId ? (
                <label className="cand-pick">
                  <input type="radio" name="choose-room" value={c.bedId} checked={chosen === c.bedId} onChange={() => setChosen(c.bedId)} />
                  Choose this room instead
                </label>
              ) : null}
            </div>
          </article>
        );
      })}

      {canDecide ? (
        <section className="card" aria-labelledby="dec-h" style={{ marginTop: "var(--gap)" }}>
          <div className="card-h">
            <h2 id="dec-h">Decision</h2>
          </div>
          <div className="card-b stack">
            <p className="muted" style={{ fontSize: ".8125rem" }}>
              Availability is checked again at the moment you approve. If the bed has been taken, nothing changes.
            </p>
            <div className="stack-s">
              <button className="btn primary block" type="button" onClick={(e) => open("approved", e.currentTarget)}>
                <Icon name="check-c" />
                <span>Approve recommendation 1</span>
              </button>
              <button
                className="btn block"
                type="button"
                disabled={!chosenCand}
                aria-disabled={!chosenCand}
                aria-describedby="modify-hint"
                onClick={(e) => open("modified", e.currentTarget)}
              >
                Approve a different room
              </button>
              <p className="hint" id="modify-hint">
                {chosenCand ? `Chosen: ${placeLine(chosenCand)}.` : "To approve a different room, choose it in the list first."}
              </p>
              <button className="btn danger block" type="button" onClick={(e) => open("rejected", e.currentTarget)}>
                Reject and add a reason
              </button>
              <button className="btn ghost block" type="button" onClick={(e) => open("rerun", e.currentTarget)}>
                Match again
              </button>
            </div>
            {mode === null ? <Result state={state} /> : null}
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="dd-h"
        onClose={() => {
          setMode(null);
          setConflictNote(false);
          opener.current?.focus();
        }}
      >
        {mode ? (
          mode === "conflict" ? (
            <div>
              <div className="dlg-h">
                <h2 id="dd-h">{titles.conflict}</h2>
                <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                  <Icon name="x" />
                </button>
              </div>
              <div className="dlg-b">
                <Callout tone="warn" title="Nothing was saved.">
                  Another booking took the bed before your approval. The student has no bed yet.
                </Callout>
                <p>Approve the next eligible room, or match again.</p>
                <ul className="stack-s" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {candidates
                    .filter((c) => c !== top && c.bedId && c.bedId !== chosen)
                    .map((c) => (
                      <li key={c.id}>
                        <button
                          className="btn block"
                          type="button"
                          onClick={() => {
                            setChosen(c.bedId);
                            setConflictNote(true);
                            setMode("modified");
                          }}
                        >
                          Rank {c.rank}: {placeLine(c)} ({c.scores?.total.toFixed(2)})
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="dlg-f">
                <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                  Close
                </button>
                <button className="btn primary" type="button" onClick={() => setMode("rerun")}>
                  Match again
                </button>
              </div>
            </div>
          ) : (
            <form action={action} key={`${mode}-${chosen}`}>
              <input type="hidden" name="reference" value={reference} />
              <input type="hidden" name="run_id" value={runId} />
              <input type="hidden" name="decision" value={mode} />
              {mode === "modified" && chosen ? <input type="hidden" name="bed_id" value={chosen} /> : null}
              <div className="dlg-h">
                <h2 id="dd-h">{titles[mode]}</h2>
                <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                  <Icon name="x" />
                </button>
              </div>
              <div className="dlg-b">
                {mode === "approved" && top ? (
                  <p>
                    <b>{placeLine(top)}</b> becomes the student&rsquo;s allocation and the bed is booked for them.
                  </p>
                ) : null}
                {mode === "modified" && chosenCand ? (
                  <p>
                    <b>{placeLine(chosenCand)}</b> becomes the student&rsquo;s allocation instead of the recommended room.
                  </p>
                ) : null}
                {mode === "rejected" ? <p>The recommended bed is released. The student sees your reason.</p> : null}
                {mode === "rerun" ? (
                  <p>The recommended bed is released and the application goes back to Submitted. Matching then runs again with the current rooms.</p>
                ) : null}
                {mode !== "approved" ? (
                  <div className="field">
                    <label htmlFor="dd-note">{mode === "rerun" ? "Note (optional)" : mode === "rejected" ? "Reason (the student sees it)" : "Reason for the change"}</label>
                    <textarea
                      id="dd-note"
                      name="note"
                      rows={3}
                      maxLength={500}
                      required={mode === "modified" || mode === "rejected"}
                      defaultValue={mode === "modified" && conflictNote ? CONFLICT_NOTE : ""}
                    />
                  </div>
                ) : null}
                {state.status === "error" && state.message ? <Result state={state} /> : null}
              </div>
              <div className="dlg-f">
                <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                  Cancel
                </button>
                <SubmitButton className={mode === "rejected" ? "btn danger solid" : "btn primary"} pendingText="Saving…">
                  {mode === "approved" ? "Approve" : mode === "modified" ? "Approve this room" : mode === "rejected" ? "Reject" : "Match again"}
                </SubmitButton>
              </div>
            </form>
          )
        ) : null}
      </dialog>
    </>
  );
}
