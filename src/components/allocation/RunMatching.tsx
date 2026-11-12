"use client";

import { useActionState } from "react";
import { runMatchingAction, runMatchingForAllAction, type AllocationState } from "@/app/actions/allocation";
import { Callout } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Timing } from "@/server/allocation/run";

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)} s`;

/** Small text with how long matching took (PRD PERF-02). Not saved in the run explanation. */
export function TimingNote({ timing }: { timing: Timing }) {
  return (
    <p className="timing">
      Matching took {secs(timing.totalMs)}
      {timing.loadMs || timing.engineMs || timing.saveMs
        ? ` (loading rooms ${secs(timing.loadMs)}, ranking ${secs(timing.engineMs)}, saving ${secs(timing.saveMs)})`
        : ""}
      .
    </p>
  );
}

export function Result({ state }: { state: AllocationState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <div role={state.status === "error" ? "alert" : "status"} className="stack-s">
      <Callout tone={state.status === "error" ? "bad" : "ok"} title={state.message}>
        {state.errorRef ? (
          <>
            Reference code <span className="ref">{state.errorRef}</span>
          </>
        ) : null}
      </Callout>
      {state.timing ? <TimingNote timing={state.timing} /> : null}
    </div>
  );
}

/** Run matching for one submitted application. */
export function RunMatchingButton({ reference, size = "" }: { reference: string; size?: "" | "sm" }) {
  const [state, action] = useActionState<AllocationState, FormData>(runMatchingAction, { status: "idle" });
  return (
    <div className="stack-s">
      <form action={action}>
        <input type="hidden" name="reference" value={reference} />
        <SubmitButton className={`btn primary ${size}`} pendingText="Matching…">
          <Icon name="sparkle" />
          <span>
            Run matching<span className="sr-only"> for {reference}</span>
          </span>
        </SubmitButton>
      </form>
      <Result state={state} />
    </div>
  );
}

/** Run matching for up to 25 submitted applications of the institution. */
export function RunAllButton({ count }: { count: number }) {
  const [state, action] = useActionState<AllocationState, FormData>(runMatchingForAllAction, { status: "idle" });
  return (
    <div className="stack-s">
      <form action={action}>
        <SubmitButton className="btn primary" pendingText="Matching… this can take a little while">
          <Icon name="sparkle" />
          <span>Run matching for all submitted{count ? ` (${Math.min(count, 25)})` : ""}</span>
        </SubmitButton>
      </form>
      {count > 25 ? <p className="hint">Up to 25 at a time. Run it again for the rest.</p> : null}
      <Result state={state} />
    </div>
  );
}
