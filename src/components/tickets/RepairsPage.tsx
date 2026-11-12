import { unstable_rethrow } from "next/navigation";
import { ErrorNotice } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { reportError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { loadBoard } from "@/server/ticket-board";
import type { Manager } from "@/server/tickets";
import { TicketBoard } from "./TicketBoard";

/** The repairs page shared by owners (/owner/tickets) and university administrators (/admin/tickets). */
export async function RepairsPage({ manager, from, sub }: { manager: Manager; from: "/owner/tickets" | "/admin/tickets"; sub: string }) {
  let data: Awaited<ReturnType<typeof loadBoard>> | null = null;
  let errorRef: string | null = null;
  try {
    data = await loadBoard(await createClient(), manager);
  } catch (err) {
    unstable_rethrow(err);
    errorRef = reportError("load repairs board", err).reference;
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Maintenance tickets</h1>
          <p className="sub">{sub} Times are Central Africa Time.</p>
        </div>
      </div>
      {errorRef ? <ErrorNotice message="We could not load the repair requests just now. Please try again." reference={errorRef} /> : null}
      {data ? (
        <section className="card" aria-labelledby="tb-h">
          <div className="card-h">
            <div>
              <h2 id="tb-h">Tickets on {from === "/owner/tickets" ? "my properties" : "partnered properties"}</h2>
              <p className="sub">Open requests first, high priority first. This view leaves out tenant identity, documents and payments.</p>
            </div>
          </div>
          <div className="card-b">
            {data.rows.length ? (
              <TicketBoard rows={data.rows} technicians={data.technicians} from={from} />
            ) : (
              <EmptyState icon="check-c" title={data.properties ? "No repair requests yet." : "There are no properties to show."}>
                {data.properties ? "Requests from tenants appear here." : "Repairs appear here for the properties you look after."}
              </EmptyState>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
