import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookies on each request (Supabase's Next.js SSR guide).
 * Returns the response that carries the refreshed cookies and whether the token was valid.
 * This is an optimistic check only. Pages and Server Functions check again on the server.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Stop shared caches from storing a response that sets auth cookies.
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it can sign people out at random.
  const { data } = await supabase.auth.getClaims();
  return { response: () => response, signedIn: Boolean(data?.claims?.sub) };
}
