import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { Icon, type IconName } from "@/components/ui/Icon";

export type HomeLink = { href: string; title: string; text: string; icon: IconName };

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || "there";
}

/** Greeting, one-off notices and links. Each role home builds on this. */
export function Home({
  name,
  subtitle,
  passwordUpdated,
  links,
  children,
}: {
  name: string;
  subtitle: string;
  passwordUpdated?: boolean;
  links: HomeLink[];
  children?: React.ReactNode;
}) {
  return (
    <div className="stack">
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Hello, {firstName(name)}</h1>
        <p>{subtitle}</p>
      </div>
      {passwordUpdated ? <Callout tone="ok" title="Your new password is saved." role="status" /> : null}
      {children}
      <div className="links">
        {links.map((l) => (
          <Link key={l.href} className="card link-card" href={l.href}>
            <Icon name={l.icon} />
            <span>
              <b>{l.title}</b>
              <small>{l.text}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function flag(v: string | string[] | undefined): boolean {
  return (Array.isArray(v) ? v[0] : v) !== undefined;
}
