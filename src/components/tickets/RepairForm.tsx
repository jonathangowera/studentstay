"use client";

import { useActionState, useState } from "react";
import { reportRepairAction, type RepairState } from "@/app/actions/repairs";
import { Callout, ErrorNotice } from "@/components/ui/Callout";
import { FieldError } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TICKET_CATEGORIES } from "@/lib/tickets/labels";
import { LIMITS } from "@/lib/tickets/validation";

export type BookingOption = { bookingId: string; label: string; location: string };

/** Report a repair for a place the student has a live booking for. The server checks the booking again. */
export function RepairForm({ bookings }: { bookings: BookingOption[] }) {
  const [state, action] = useActionState<RepairState, FormData>(reportRepairAction, { status: "idle" });
  const [bookingId, setBookingId] = useState(bookings[0]?.bookingId ?? "");
  const [location, setLocation] = useState(bookings[0]?.location ?? "");
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const err = (name: string) => ({
    "aria-invalid": errors?.[name] ? true : undefined,
    "aria-describedby": `rp-${name}-err`,
  });

  return (
    <form action={action} className="stack" key={state.status === "success" ? state.reference : "form"} noValidate>
      {state.status === "success" && state.message ? <Callout tone="ok" title={state.message} role="status" /> : null}
      {state.status === "error" && state.message && !errors ? <ErrorNotice message={state.message} reference={state.errorRef} /> : null}
      {state.status === "error" && errors ? <Callout tone="bad" title={state.message ?? "Check the highlighted fields."} role="alert" /> : null}

      {bookings.length > 1 ? (
        <div className="field">
          <label htmlFor="rp-booking_id">Place</label>
          <select
            id="rp-booking_id"
            name="booking_id"
            value={bookingId}
            onChange={(e) => {
              setBookingId(e.target.value);
              setLocation(bookings.find((b) => b.bookingId === e.target.value)?.location ?? "");
            }}
            {...err("booking_id")}
          >
            {bookings.map((b) => (
              <option key={b.bookingId} value={b.bookingId}>
                {b.label}
              </option>
            ))}
          </select>
          <FieldError id="rp-booking_id-err" message={errors?.booking_id} />
        </div>
      ) : (
        <input type="hidden" name="booking_id" value={bookingId} />
      )}

      <div className="field">
        <label htmlFor="rp-category">Category</label>
        <select id="rp-category" name="category" defaultValue="" required {...err("category")}>
          <option value="" disabled>
            Choose a category
          </option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FieldError id="rp-category-err" message={errors?.category} />
      </div>

      <div className="field">
        <label htmlFor="rp-title">Title</label>
        <input id="rp-title" name="title" required minLength={3} maxLength={LIMITS.title} placeholder="For example: Leaking tap" {...err("title")} />
        <FieldError id="rp-title-err" message={errors?.title} />
      </div>

      <div className="field">
        <label htmlFor="rp-description">Description (optional)</label>
        <textarea id="rp-description" name="description" rows={3} maxLength={LIMITS.description} {...err("description")} />
        <FieldError id="rp-description-err" message={errors?.description} />
      </div>

      <fieldset className="field">
        <legend>How urgent is it?</legend>
        <div className="opts o3" {...err("priority")}>
          {(
            [
              ["low", "Low", "It can wait a week"],
              ["medium", "Medium", "Within 3 days"],
              ["high", "High", "Within 24 hours, for example no water or power"],
            ] as const
          ).map(([v, l, hint]) => (
            <label className="opt" key={v}>
              <input type="radio" name="priority" value={v} defaultChecked={v === "medium"} />
              <span>
                <b>{l}</b>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="rp-priority-err" message={errors?.priority} />
      </fieldset>

      <div className="field">
        <label htmlFor="rp-location">Where is the problem?</label>
        <input id="rp-location" name="location" required maxLength={LIMITS.location} value={location} onChange={(e) => setLocation(e.target.value)} {...err("location")} />
        <p className="hint">The technician sees this. Add the exact spot, for example the shared bathroom.</p>
        <FieldError id="rp-location-err" message={errors?.location} />
      </div>

      <div className="row">
        <SubmitButton pendingText="Sending…">Send repair request</SubmitButton>
      </div>
    </form>
  );
}
