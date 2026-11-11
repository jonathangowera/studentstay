import { ROLE_HOME, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { getSession } from "@/server/session";
import { Brand } from "./Brand";
import { NavLinks, type NavItem } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

const NAV: Record<Role, NavItem[]> = {
  student: [
    { href: "/student", label: "Home" },
    { href: "/listings", label: "Find a home" },
    { href: "/student/shortlist", label: "Shortlist" },
    { href: "/student/profile", label: "Profile" },
  ],
  owner: [
    { href: "/owner", label: "Home" },
    { href: "/owner/profile", label: "Profile" },
    { href: "/owner/audit", label: "Audit log" },
  ],
  university_admin: [
    { href: "/admin", label: "Home" },
    { href: "/admin/profile", label: "Profile" },
    { href: "/admin/audit", label: "Audit log" },
  ],
  technician: [
    { href: "/technician", label: "Home" },
    { href: "/technician/profile", label: "Profile" },
  ],
  system_admin: [
    { href: "/system", label: "Home" },
    { href: "/system/profile", label: "Profile" },
    { href: "/system/audit", label: "Audit log" },
  ],
};

/**
 * Header and frame for a role area. Display only: every page under it calls requireRole itself,
 * because layouts do not re-run on client-side navigation.
 */
export async function AppShell({ area, children }: { area: Role; children: React.ReactNode }) {
  const session = await getSession();
  const showNav = session?.role === area;
  return (
    <>
      <header className="sh">
        <div className="wrap sh-in">
          <Brand href={ROLE_HOME[area]} />
          {showNav ? <NavLinks items={NAV[area]} label="Main" /> : null}
          <span className="sp" />
          {session ? (
            <>
              <div className="who">
                <b>{session.profile.full_name || session.email}</b>
                <small>{ROLE_LABEL[session.role]}</small>
              </div>
              <SignOutButton />
            </>
          ) : null}
        </div>
      </header>
      <main id="main" className="wrap main">
        {children}
      </main>
    </>
  );
}
