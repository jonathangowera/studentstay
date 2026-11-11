import Link from "next/link";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/roles";
import { getSession } from "@/server/session";
import { Brand } from "./Brand";
import { NavLinks } from "./NavLinks";
import { PublicHeaderFrame } from "./PublicHeaderFrame";
import { SignOutButton } from "./SignOutButton";

const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Find a home" },
  { href: "/help", label: "Help" },
];

export async function PublicHeader() {
  const session = await getSession();
  return (
    <PublicHeaderFrame brand={<Brand />}>
      <NavLinks items={PUBLIC_NAV} label="Main" />
      <div className="sh-act">
        {session ? (
          <>
            <Link className="btn primary sm" href={ROLE_HOME[session.role]}>
              {ROLE_LABEL[session.role]} home
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
    </PublicHeaderFrame>
  );
}
