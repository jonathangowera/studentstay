import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="logo">
        <Icon name="logo" />
      </span>
      <span>
        <b>StudentStay</b>
        <small>Student housing in Lusaka</small>
      </span>
    </Link>
  );
}
