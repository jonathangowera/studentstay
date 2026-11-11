import { Icon, type IconName } from "./Icon";

type Tone = "info" | "warn" | "bad" | "ok";
const ICON: Record<Tone, IconName> = { info: "info", warn: "alert", bad: "x-c", ok: "check-c" };

export function Callout({
  tone,
  title,
  children,
  role,
}: {
  tone: Tone;
  title: string;
  children?: React.ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div className={`callout c-${tone}`} role={role}>
      <Icon name={ICON[tone]} />
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

/** A friendly error with the reference code the person can quote. */
export function ErrorNotice({ message, reference }: { message: string; reference?: string | null }) {
  return (
    <Callout tone="bad" title={message} role="alert">
      {reference ? (
        <>
          Reference code <span className="ref">{reference}</span>
        </>
      ) : null}
    </Callout>
  );
}
