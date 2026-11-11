import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { searchListings } from "./listings";
import { EMPTY_FILTERS } from "@/lib/listings/filters";

type Reply = { data: unknown; count: number | null; error: { code: string; message: string } | null };

/**
 * A stand-in for the Supabase client: every builder method returns the builder, and awaiting it gives the reply
 * chosen for that query. Records each query so the test can see what was asked.
 */
function fakeClient(reply: (q: { table: string; columns: string; head: boolean }) => Reply) {
  const queries: { table: string; columns: string; head: boolean }[] = [];
  return {
    queries,
    client: {
      from(table: string) {
        return {
          select(columns: string, opts?: { head?: boolean }) {
            const q = { table, columns, head: !!opts?.head };
            queries.push(q);
            const builder: Record<string, unknown> = {};
            for (const m of ["eq", "gt", "gte", "lte", "in", "contains", "overlaps", "not", "order", "range"]) {
              builder[m] = () => builder;
            }
            builder.then = (resolve: (r: Reply) => unknown) => resolve(reply(q));
            return builder;
          },
        };
      },
    },
  };
}

describe("searchListings", () => {
  it("returns the rows and the total", async () => {
    const { client } = fakeClient(() => ({ data: [{ id: "a", name: "A" }], count: 1, error: null }));
    const r = await searchListings(EMPTY_FILTERS, client as never);
    expect(r.rows.map((x) => x.id)).toEqual(["a"]);
    expect(r.total).toBe(1);
  });

  it("treats a page past the end as an empty page with the real total, not an error", async () => {
    const { client, queries } = fakeClient((q) =>
      q.head
        ? { data: null, count: 8, error: null }
        : { data: null, count: null, error: { code: "PGRST103", message: "Requested range not satisfiable" } },
    );
    const r = await searchListings({ ...EMPTY_FILTERS, page: 2 }, client as never);
    expect(r).toMatchObject({ rows: [], total: 8 });
    expect(queries.at(-1)).toEqual({ table: "listing_cards", columns: "id", head: true });
  });

  it("still throws other database errors", async () => {
    const { client } = fakeClient(() => ({ data: null, count: null, error: { code: "42501", message: "permission denied" } }));
    await expect(searchListings(EMPTY_FILTERS, client as never)).rejects.toMatchObject({ code: "42501" });
  });
});
