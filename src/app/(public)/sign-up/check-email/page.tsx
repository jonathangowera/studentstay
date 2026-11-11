import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="wrap main">
      <div className="auth single">
        <section className="card card-b stack" aria-labelledby="ce-h">
          <span className="logo" style={{ width: "3rem", height: "3rem" }}>
            <Icon name="mail" />
          </span>
          <h1 id="ce-h" style={{ fontSize: "1.5rem" }}>
            Check your email
          </h1>
          <p>
            We sent a link to the address you entered. Open it to confirm your email, then sign in.
          </p>
          <p className="muted" style={{ fontSize: ".875rem" }}>
            The link can take a few minutes to arrive. Check your spam folder too. If you already have an account with
            this email, sign in or reset your password instead.
          </p>
          <div className="row">
            <Link className="btn primary" href="/sign-in">
              Go to sign in
            </Link>
            <Link className="btn ghost" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
