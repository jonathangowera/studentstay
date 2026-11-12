/**
 * Test helper: a fake Supabase client that records every query in order and signs in as a chosen role.
 * Used with vi.mock("@/lib/supabase/server") so the real requireRole runs against fake data.
 * Not a test file itself (the runner only picks up *.test.ts).
 */
import type { Role } from "@/lib/auth/roles";

export type Call = { table?: string; rpc?: string; op: string; payload?: unknown; filters: string[] };
export type Reply = { data?: unknown; error?: unknown; count?: number | null };

const METHODS = ["select", "insert", "update", "eq", "neq", "in", "is", "or", "order", "limit", "range", "maybeSingle", "single"];

export const USER_ID = "99999999-9999-4999-8999-999999999999";

export function fakeSupabase(role: Role | null, reply: (c: Call) => Reply | undefined = () => undefined, profile: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const builder = (call: Call) => {
    const b: Record<string, unknown> = {};
    for (const m of METHODS) {
      b[m] = (...args: unknown[]) => {
        if (m === "insert" || m === "update") {
          call.op = m;
          call.payload = args[0];
        } else if (m !== "select") call.filters.push(`${m}:${args.map((a) => JSON.stringify(a)).join(",")}`);
        return b;
      };
    }
    b.then = (resolve: (r: Reply) => unknown, reject?: (e: unknown) => unknown) => {
      try {
        // The profile lookup made by getSession is answered here, so tests only describe their own data.
        if (call.table === "profiles" && call.filters.some((f) => f === `eq:"id","${USER_ID}"`)) {
          return resolve({ data: role ? { id: USER_ID, role, full_name: "Demo Person", institution_id: null, ...profile } : null, error: null });
        }
        return resolve({ data: null, error: null, count: null, ...(reply(call) ?? {}) });
      } catch (e) {
        return reject ? reject(e) : Promise.reject(e);
      }
    };
    return b;
  };
  const client = {
    auth: {
      getClaims: async () => (role ? { data: { claims: { sub: USER_ID, email: "demo@example.com" } }, error: null } : { data: null, error: null }),
    },
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      calls.push(call);
      return builder(call);
    },
    rpc(name: string, payload: unknown) {
      const call: Call = { rpc: name, op: "rpc", payload, filters: [] };
      calls.push(call);
      return builder(call);
    },
  };
  /** Every query except the session's own profile lookup. */
  const dataCalls = () => calls.filter((c) => !(c.table === "profiles" && c.filters.some((f) => f === `eq:"id","${USER_ID}"`)));
  return { client, calls, dataCalls };
}

/** Next.js redirect() throws an error whose digest holds the target. */
export function redirectTarget(err: unknown): string | null {
  const digest = (err as { digest?: unknown })?.digest;
  if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) return null;
  return digest.split(";")[2] ?? null;
}

export function formOf(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
