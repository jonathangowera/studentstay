import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_LABEL, ROLES } from "@/lib/auth/roles";
import { reportError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { allUsers, type SystemUser } from "@/server/system";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: "Users" };

export default async function SystemUsers() {
  await requireRole("system_admin", "/system/users");

  let users: SystemUser[] | null = null;
  let errorRef: string | null = null;
  try {
    users = await allUsers(await createClient());
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load system users", err).reference;
  }

  const order = new Map(ROLES.map((r, i) => [r, i]));
  const sorted = users ? [...users].sort((a, b) => (order.get(a.role) ?? 9) - (order.get(b.role) ?? 9) || a.full_name.localeCompare(b.full_name)) : [];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="sub">Every account, read only. Roles are changed by an administrator in the database, never from this screen.</p>
        </div>
      </div>
      {errorRef ? <ErrorNotice message="We could not load the users just now. Please try again." reference={errorRef} /> : null}
      {users ? (
        <section className="card" aria-labelledby="u-h">
          <div className="card-h">
            <div>
              <h2 id="u-h">Accounts</h2>
              <p className="sub">{users.length} accounts. Grouped by role.</p>
            </div>
          </div>
          <div className="card-b">
            {sorted.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <caption className="sr-only">All accounts with their role and institution</caption>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Role</th>
                      <th scope="col">Institution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((u) => (
                      <tr key={u.id}>
                        <th scope="row">{u.full_name || "No name given"}</th>
                        <td>{ROLE_LABEL[u.role]}</td>
                        <td>{u.institution ?? <span className="muted">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="users" title="There are no accounts yet." />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
