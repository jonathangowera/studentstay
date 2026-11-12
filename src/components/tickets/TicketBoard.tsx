"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { manageTicketAction, type TicketState } from "@/app/actions/tickets";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { duePill, priorityPill, ticketStatusPill, type DueState, type TicketPriority, type TicketStatus } from "@/lib/tickets/labels";
import { NOTE_MAX } from "@/lib/transitions";

export type BoardRow = {
  id: string;
  reference: string;
  title: string;
  category: string;
  property: string;
  location: string;
  priority: TicketPriority;
  status: TicketStatus;
  statusNote: string | null;
  assignedName: string | null;
  due: DueState;
  dueText: string | null;
  createdText: string;
  assign: boolean;
  escalate: boolean;
};

type Mode = "assign" | "escalate";

function Pill({ p }: { p: { tone: Parameters<typeof StatusPill>[0]["tone"]; icon: Parameters<typeof StatusPill>[0]["icon"]; label: string } | null }) {
  return p ? <StatusPill tone={p.tone} icon={p.icon} label={p.label} /> : null;
}

/**
 * Repairs on the properties an owner or administrator looks after. Assign and Escalate each open one native
 * <dialog>; buttons appear only when the database allows the move. The server checks scope and status again.
 */
export function TicketBoard({ rows, technicians, from }: { rows: BoardRow[]; technicians: { id: string; full_name: string }[]; from: "/owner/tickets" | "/admin/tickets" }) {
  const [state, action] = useActionState<TicketState, FormData>(manageTicketAction, { status: "idle" });
  const [target, setTarget] = useState<{ row: BoardRow; mode: Mode } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state.status === "success") dialog.current?.close();
  }, [state]);

  function open(row: BoardRow, mode: Mode, el: HTMLElement) {
    opener.current = el;
    setTarget({ row, mode });
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <div className="stack">
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      <div className="tbl-wrap">
        <table className="tbl">
          <caption className="sr-only">Repair requests</caption>
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              <th scope="col">Issue</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Assigned to</th>
              <th scope="col">Due</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <span className="ref">{r.reference}</span>
                  <small>{r.createdText}</small>
                </th>
                <td>
                  <b>{r.title}</b>
                  <small>
                    {r.category} · {r.property}
                  </small>
                  <small>{r.location}</small>
                </td>
                <td>
                  <Pill p={priorityPill(r.priority)} />
                </td>
                <td>
                  <div className="stack-s">
                    <Pill p={ticketStatusPill(r.status)} />
                    <Pill p={duePill(r.due)} />
                  </div>
                  {r.statusNote ? <small>{r.statusNote}</small> : null}
                </td>
                <td>{r.assignedName ?? <span className="muted">Not assigned</span>}</td>
                <td>{r.dueText ?? <span className="muted">No due time</span>}</td>
                <td>
                  <div className="row nowrap">
                    {r.assign ? (
                      <button className="btn sm soft" type="button" aria-haspopup="dialog" onClick={(e) => open(r, "assign", e.currentTarget)}>
                        {r.assignedName ? "Reassign" : "Assign"}
                        <span className="sr-only"> {r.reference}</span>
                      </button>
                    ) : null}
                    {r.escalate ? (
                      <button className="btn sm" type="button" aria-haspopup="dialog" onClick={(e) => open(r, "escalate", e.currentTarget)}>
                        Escalate<span className="sr-only"> {r.reference}</span>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialog}
        className="dlg"
        aria-labelledby="mt-h"
        onClose={() => {
          setTarget(null);
          opener.current?.focus();
        }}
      >
        {target ? (
          <form action={action} key={`${target.row.id}-${target.mode}`}>
            <input type="hidden" name="ticket_id" value={target.row.id} />
            <input type="hidden" name="reference" value={target.row.reference} />
            <input type="hidden" name="kind" value={target.mode} />
            <input type="hidden" name="from" value={from} />
            <div className="dlg-h">
              <h2 id="mt-h">
                {target.mode === "assign" ? "Assign a technician" : "Escalate this request?"}
                <small className="dlg-sub">
                  {target.row.reference}: {target.row.title}
                </small>
              </h2>
              <button className="btn ghost sm icon" type="button" onClick={() => dialog.current?.close()} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="dlg-b">
              {target.mode === "assign" ? (
                technicians.length ? (
                  <div className="field">
                    <label htmlFor="mt-tech">Technician</label>
                    <select id="mt-tech" name="technician_id" required defaultValue="" aria-invalid={errors?.technician_id ? true : undefined} aria-describedby="mt-tech-err">
                      <option value="" disabled>
                        Choose a technician
                      </option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || "Technician"}
                        </option>
                      ))}
                    </select>
                    <FieldError id="mt-tech-err" message={errors?.technician_id} />
                  </div>
                ) : (
                  <Callout tone="warn" title="There are no technicians to assign to yet." />
                )
              ) : (
                <p>The tenant is told. Use this when a repair is stuck or past its target time.</p>
              )}
              <div className="field">
                <label htmlFor="mt-note">{target.mode === "assign" ? "Note to the technician (optional)" : "Reason for escalating"}</label>
                <textarea
                  id="mt-note"
                  name="note"
                  rows={3}
                  maxLength={NOTE_MAX}
                  required={target.mode === "escalate"}
                  aria-invalid={errors?.note ? true : undefined}
                  aria-describedby="mt-note-err"
                />
                <FieldError id="mt-note-err" message={errors?.note} />
              </div>
              {state.status === "error" && state.message && !errors?.note && !errors?.technician_id ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
            </div>
            <div className="dlg-f">
              <button className="btn" type="button" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <SubmitButton className={target.mode === "escalate" ? "btn danger solid" : "btn primary"} pendingText="Saving…">
                {target.mode === "assign" ? "Assign and notify" : "Escalate"}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
