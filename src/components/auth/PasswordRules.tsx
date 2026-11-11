import { passwordRules } from "@/lib/validation";
import { Icon } from "@/components/ui/Icon";

/** Live checklist under a new-password field. Each rule shows an icon and text, not colour alone. */
export function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul className="rules" id={id} aria-label="Password rules">
      {passwordRules(password).map((r) => (
        <li key={r.id} className={r.met ? "met" : undefined}>
          <Icon name={r.met ? "check-c" : "circle"} />
          <span>
            {r.label}
            <span className="sr-only">{r.met ? " (done)" : " (not yet)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
