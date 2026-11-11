import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/roles";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "You do not have access", robots: { index: false } };

export default async function NoAccessPage() {
  const session = await getSession();
  return (
    <div className="wrap main">
      <div className="auth single">
        <section className="card card-b stack" aria-labelledby="na-h">
          <span className="pill s-warn" style={{ justifySelf: "start" }}>
            <Icon name="lock" />
            <span>No access</span>
          </span>
          <h1 id="na-h" style={{ fontSize: "1.5rem" }}>
            You do not have access to this page
          </h1>
          {session ? (
            <>
              <p>
                You are signed in as a {ROLE_LABEL[session.role].toLowerCase()}. This page is for a different kind of
                account.
              </p>
              <div className="row">
                <Link className="btn primary" href={ROLE_HOME[session.role]}>
                  Go to your home
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>Sign in with an account that can open this page.</p>
              <Link className="btn primary" href="/sign-in">
                Sign in
              </Link>
            </>
          )}
          <p className="muted" style={{ fontSize: ".875rem" }}>
            If you think you should have access, contact your accommodation office or the platform administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
