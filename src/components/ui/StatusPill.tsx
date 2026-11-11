import { Icon, type IconName } from "./Icon";

export type Tone = "ok" | "warn" | "bad" | "info" | "mute";

const DEFAULT_ICON: Record<Tone, IconName> = {
  ok: "check-c",
  warn: "clock",
  bad: "x-c",
  info: "info",
  mute: "circle",
};

/** Status is never colour alone: icon, text and colour together. */
export function StatusPill({ tone, label, icon }: { tone: Tone; label: string; icon?: IconName }) {
  return (
    <span className={`pill s-${tone}`}>
      <Icon name={icon ?? DEFAULT_ICON[tone]} />
      <span>{label}</span>
    </span>
  );
}
