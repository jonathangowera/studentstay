import type { Metadata } from "next";
import Link from "next/link";
import { AuthView } from "@/components/auth/AuthView";
import { Callout } from "@/components/ui/Callout";
import { ROLE_HOME, ROLE_LABEL, safeNextPath } from "@/lib/auth/roles";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const params = await props.searchParams;
  const next = safeNextPath(first(params.next));
  const session = await getSession();

  let notice: React.ReactNode = null;
  if (session) {
    notice = (
      <Callout tone="info" title={`You are signed in as ${ROLE_LABEL[session.role].toLowerCase()}.`}>
        <Link href={ROLE_HOME[session.role]}>Go to your home</Link>, or sign out to use another account.
      </Callout>
    );
  } else if (first(params.error) === "link") {
    notice = (
      <Callout tone="warn" title="That link has expired or was already used." role="alert">
        Sign in below, or ask for a new link with Forgot password.
      </Callout>
    );
  } else if (first(params.signed_out)) {
    notice = <Callout tone="ok" title="You have signed out." role="status" />;
  } else if (next) {
    notice = <Callout tone="info" title="Please sign in to continue." />;
  }

  return <AuthView next={next} notice={notice} />;
}
