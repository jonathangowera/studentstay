"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setShortlisted } from "@/app/actions/shortlist";
import { signInUrlFor } from "@/lib/auth/roles";
import type { HeartMode } from "@/lib/listings/shortlist";
import { Icon } from "@/components/ui/Icon";

/**
 * Shortlist heart. Only rendered for visitors (a sign-in link) and students (a toggle).
 * variant "icon" is the round button on cards; "full" is the labelled button on the details page.
 */
export function HeartButton({
  mode,
  listingId,
  listingName,
  initialSaved,
  returnTo,
  variant = "icon",
}: {
  mode: HeartMode;
  listingId: string;
  listingName: string;
  initialSaved: boolean;
  returnTo: string;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (mode === "hidden") return null;

  const full = variant === "full";
  const cls = full ? "btn fav" : "fav";

  if (mode === "guest") {
    return (
      <Link className={cls} href={signInUrlFor(returnTo)} aria-label={full ? undefined : `Sign in to save ${listingName} to your shortlist`}>
        <Icon name="heart" />
        {full ? <span>Save to shortlist</span> : null}
      </Link>
    );
  }

  function toggle() {
    const next = !saved;
    setSaved(next); // optimistic
    setError(null);
    start(async () => {
      const res = await setShortlisted(listingId, next, returnTo);
      if (res.ok) return;
      setSaved(!next);
      if ("signIn" in res) {
        router.push(res.signIn);
        return;
      }
      setError(res.reference ? `${res.message} Reference ${res.reference}.` : res.message);
    });
  }

  return (
    <span style={{ display: "inline-grid", gap: ".35rem", justifyItems: full ? "start" : "end" }}>
      <button
        type="button"
        className={cls}
        aria-pressed={saved}
        aria-busy={pending || undefined}
        aria-label={full ? undefined : `Save ${listingName} to shortlist`}
        onClick={toggle}
      >
        <Icon name="heart" />
        {full ? <span>{saved ? "Saved to shortlist" : "Save to shortlist"}</span> : null}
      </button>
      <span role="status" className={error ? "pill s-bad" : "sr-only"} style={error ? { whiteSpace: "normal", maxWidth: "16rem" } : undefined}>
        {error ?? (pending ? "" : saved ? `${listingName} is on your shortlist` : "")}
      </span>
    </span>
  );
}
