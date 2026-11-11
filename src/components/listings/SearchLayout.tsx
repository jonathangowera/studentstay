"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { filtersToParams, parseListingFilters } from "@/lib/listings/filters";

export const FILTER_FORM_ID = "listing-filters";

/**
 * Set every field to match the URL. Runs after each navigation (back button, chip links, Clear all) so the form
 * never shows a filter that is not applied. It changes values only, never focus.
 */
function syncForm(form: HTMLFormElement, params: URLSearchParams) {
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement) {
      if (!el.name) continue;
      if (el.type === "checkbox") el.checked = params.getAll(el.name).includes(el.value);
      else if (el.type === "radio") el.checked = (params.get(el.name) ?? "") === el.value;
      else if (el.type === "number") {
        el.value = params.get(el.name) ?? "";
        el.defaultValue = el.value;
      }
    } else if (el instanceof HTMLSelectElement && el.name) {
      const v = params.get(el.name);
      if (v !== null || el.options.length) el.value = v ?? el.options[0]?.value ?? "";
    }
  }
}

/**
 * FormData -> the canonical query string the server would redirect to (defaults such as sort=best left out),
 * so a change costs one navigation, not a navigation and a redirect.
 */
function toQuery(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(form)) {
    if (typeof v === "string" && v.trim() !== "") params.append(k, v.trim());
  }
  return filtersToParams(parseListingFilters(params)).toString();
}

/**
 * The listings page frame: the filter form on the left, results on the right.
 * Without JavaScript the form is a plain GET form with an Apply button.
 * With JavaScript, ticking a box or changing the sort updates the URL straight away (client navigation),
 * each change is a history entry so the back button steps back through searches.
 */
export function SearchLayout({
  fields,
  children,
  activeCount,
}: {
  fields: React.ReactNode;
  children: React.ReactNode;
  activeCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const qs = useSearchParams().toString();

  useEffect(() => {
    const form = document.getElementById(FILTER_FORM_ID);
    if (form instanceof HTMLFormElement) syncForm(form, new URLSearchParams(qs));
  }, [qs]);

  function go(form: HTMLFormElement) {
    const qs = toQuery(form);
    start(() => router.push(qs ? `/listings?${qs}` : "/listings", { scroll: false }));
  }

  function formOf(target: EventTarget | null): HTMLFormElement | null {
    const el = target as HTMLInputElement | HTMLSelectElement | null;
    return el?.form && el.form.id === FILTER_FORM_ID ? el.form : null;
  }

  return (
    <div
      className="lay"
      onChange={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.type === "number") return; // typed numbers apply on Enter, on leaving the field, or with Apply
        const form = formOf(t);
        if (form) go(form);
      }}
      onBlur={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.type !== "number" || t.value === t.defaultValue) return;
        const form = formOf(t);
        if (form) go(form);
      }}
    >
      <aside className="filters" data-open={open ? "" : undefined} aria-labelledby="filters-h">
        <div className="filters-h">
          <h2 id="filters-h">
            Filters{activeCount ? <span className="muted" style={{ fontWeight: 600 }}> ({activeCount} on)</span> : null}
          </h2>
          <button
            type="button"
            className="btn sm filters-toggle"
            aria-expanded={open}
            aria-controls={FILTER_FORM_ID}
            onClick={() => setOpen(!open)}
          >
            <Icon name="filter" />
            {open ? "Hide filters" : "Show filters"}
          </button>
        </div>
        <form
          id={FILTER_FORM_ID}
          action="/listings"
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            go(e.currentTarget);
          }}
        >
          {fields}
        </form>
      </aside>
      <section aria-labelledby="results-h" aria-busy={pending || undefined} style={{ minWidth: 0 }}>
        <p role="status" className={pending ? "pill s-info" : "sr-only"} style={{ marginBottom: pending ? ".75rem" : 0 }}>
          {pending ? (
            <>
              <Icon name="clock" />
              <span>Updating results</span>
            </>
          ) : null}
        </p>
        <div style={{ opacity: pending ? 0.6 : 1, transition: "opacity .15s" }}>{children}</div>
      </section>
    </div>
  );
}
