import { StatusPill } from "@/components/ui/StatusPill";

export function StudentNumberPill({ number, matched }: { number: string | null; matched: boolean }) {
  if (!number) return <StatusPill tone="mute" label="No student number yet" />;
  if (matched) return <StatusPill tone="ok" label="Confirmed" />;
  return <StatusPill tone="warn" label="Waiting for confirmation" />;
}
