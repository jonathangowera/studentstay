import Link from "next/link";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getSession } from "@/server/session";
import { Brand } from "./Brand";
import { SignOutButton } from "./SignOutButton";

export async function PublicHeader() {
  const session = await getSession();
  return (
    <header className="sh">
      <div className="wrap sh-in">
        <Brand />
        <span className="sp" />
        <div className="row" style={{ gap: ".4rem" }}>
          {session ? (
            <>
              <Link className="btn primary sm" href={ROLE_HOME[session.role]}>
                Go to your home
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="btn ghost sm" href="/sign-in">
                Sign in
              </Link>
              <Link className="btn primary sm" href="/sign-up">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
