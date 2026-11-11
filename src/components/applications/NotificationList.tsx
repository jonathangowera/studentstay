import Link from "next/link";
import { markNotificationRead } from "@/app/actions/notifications";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTimeCAT } from "@/lib/format";
import { notificationHref } from "@/lib/notifications";
import type { Notification } from "@/server/applications";

const KIND_ICON: Record<string, IconName> = { application: "file", payment: "key", ticket: "alert", announcement: "info" };

/**
 * Notifications, unread highlighted with a "New" pill (icon and text, not colour alone).
 * With `markable`, each unread item has a Mark as read button (a plain form, works without JavaScript).
 */
export function NotificationList({ items, markable, returnTo }: { items: Notification[]; markable?: boolean; returnTo: string }) {
  return (
    <ul className="notifs">
      {items.map((n) => {
        const href = notificationHref(n.link);
        const unread = n.read_at === null;
        return (
          <li key={n.id} className={unread ? "unread" : undefined}>
            <span className="ni">
              <Icon name={KIND_ICON[n.kind] ?? "info"} />
            </span>
            <div className="nt">
              <b>
                {n.title} {unread ? <StatusPill tone="info" icon="sparkle" label="New" /> : null}
              </b>
              {n.body ? <p>{n.body}</p> : null}
              <time dateTime={n.created_at}>{formatDateTimeCAT(n.created_at)}</time>
            </div>
            {href || (markable && unread) ? (
              <div className="na">
                {href ? (
                  <Link className="btn sm soft" href={href}>
                    Open<span className="sr-only">: {n.title}</span>
                  </Link>
                ) : null}
                {markable && unread ? (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="btn sm" type="submit">
                      Mark as read<span className="sr-only">: {n.title}</span>
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
