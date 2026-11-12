import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { NotificationList } from "@/components/applications/NotificationList";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { myNotifications, unreadCount, type Notification } from "@/server/applications";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Notifications" };

const REF = /^REF-[A-Z0-9]{6}$/;

export default async function NotificationsPage({ searchParams }: PageProps<"/student/notifications">) {
  const session = await requireRole("student", "/student/notifications");
  const sp = await searchParams;
  const unreadOnly = sp.show === "unread";
  const actionError = typeof sp.error === "string" && REF.test(sp.error) ? sp.error : null;
  const here = unreadOnly ? "/student/notifications?show=unread" : "/student/notifications";
  const supabase = await createClient();

  let items: Notification[] = [];
  let unread = 0;
  let errorRef: string | null = null;
  try {
    [items, unread] = await Promise.all([
      myNotifications(supabase, session.userId, { unreadOnly }),
      unreadCount(supabase, session.userId),
    ]);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load notifications", err).reference;
  }

  return (
    <div className="stack">
      <div className="pg-head" style={{ marginBottom: 0 }}>
        <h1>Notifications</h1>
        <p>{unread === 1 ? "1 unread update." : `${unread} unread updates.`} Only you can see these.</p>
      </div>

      <div className="row">
        <ul className="filter-chips" aria-label="Show">
          <li>
            <Link href="/student/notifications" aria-current={!unreadOnly ? "page" : undefined}>
              All
            </Link>
          </li>
          <li>
            <Link href="/student/notifications?show=unread" aria-current={unreadOnly ? "page" : undefined}>
              Unread
            </Link>
          </li>
        </ul>
        <span className="sp" />
        {unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <input type="hidden" name="returnTo" value={here} />
            <button className="btn sm" type="submit">
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {actionError ? <ErrorNotice message="We could not update that notification. Please try again." reference={actionError} /> : null}
      {errorRef ? <ErrorNotice message="We could not load your notifications just now. Please try again." reference={errorRef} /> : null}

      {!errorRef ? (
        items.length ? (
          <section className="card" aria-label={unreadOnly ? "Unread notifications" : "All notifications"} style={{ overflow: "hidden" }}>
            <NotificationList items={items} markable returnTo={here} />
          </section>
        ) : (
          <div className="card">
            <EmptyState as="h2" icon="info" title={unreadOnly ? "You have read everything." : "No notifications yet."}>
              {unreadOnly ? "New updates about your applications will appear here." : "When something changes on an application, it appears here."}
            </EmptyState>
            {unreadOnly ? (
              <div className="row" style={{ justifyContent: "center", paddingBottom: "2rem" }}>
                <Link className="btn" href="/student/notifications">
                  Show all
                </Link>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
