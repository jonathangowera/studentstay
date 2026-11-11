"use client";

import Link from "next/link";
import { MAX_COMPARE, compareHref } from "@/lib/listings/compare";
import { Icon } from "@/components/ui/Icon";
import { useCompare } from "./compare-store";

/** The Compare checkbox on a card. A fourth place cannot be ticked; the bar explains why. */
export function CompareToggle({ id, name }: { id: string; name: string }) {
  const { ids, toggle } = useCompare();
  const checked = ids.includes(id);
  return (
    <label className="cmp">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (!toggle(id, e.target.checked)) e.target.checked = false;
        }}
        aria-describedby="compare-status"
      />
      <span>
        Compare<span className="sr-only"> {name}</span>
      </span>
    </label>
  );
}

/** Sticky bar under the results: how many are ticked, the limit message, and the link to compare. */
export function CompareBar({ institution }: { institution: string | null }) {
  const { ids, message, clear } = useCompare();
  const n = ids.length;
  return (
    <>
      {/* Always present so screen readers hear the change, including the limit message. */}
      <p id="compare-status" className="sr-only" role="status">
        {message ?? (n ? `${n} selected to compare, up to ${MAX_COMPARE}.` : "")}
      </p>
      <div className="cmpbar" hidden={n === 0 && !message}>
      <div style={{ display: "grid", gap: ".15rem" }} aria-hidden="true">
        <span>
          <b>{n} selected</b> to compare (up to {MAX_COMPARE})
        </span>
        {message ? (
          <span className="msg">
            <Icon name="alert" />
            {message}
          </span>
        ) : null}
      </div>
      <div className="row">
        {n > 0 ? (
          <button type="button" className="btn sm ghost" onClick={clear}>
            Clear
          </button>
        ) : null}
        {n >= 2 ? (
          <Link className="btn sm on-dark" href={compareHref(ids, institution)}>
            <Icon name="scale" />
            <span>Compare now</span>
          </Link>
        ) : n === 1 ? (
          <span style={{ fontSize: ".8125rem" }}>Choose one more place</span>
        ) : null}
      </div>
      </div>
    </>
  );
}
