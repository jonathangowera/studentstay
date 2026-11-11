"use client";

import Link from "next/link";
import { Callout } from "./Callout";

/** Body of every error.tsx. Shows the server digest as the reference code; never the raw message. */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="wrap main">
      <div className="card card-b stack" style={{ maxWidth: "36rem" }}>
        <Callout tone="bad" title="Something went wrong. Please try again." role="alert">
          {error.digest ? (
            <>
              Reference code <span className="ref">{error.digest}</span>
            </>
          ) : (
            "If it keeps happening, contact support."
          )}
        </Callout>
        <div className="row">
          <button className="btn primary" type="button" onClick={() => retry()}>
            Try again
          </button>
          <Link className="btn ghost" href="/">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
