import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isProtectedPath, signInUrlFor } from "@/lib/auth/roles";
import { canonicalListingsUrl } from "@/lib/listings/filters";

// TODO(OD-04): session expiry (staff 30 minutes, students 12 hours) is not enforced.
// It needs Supabase Pro (one project-wide inactivity timeout) or a decision on server-side enforcement.
// See "Sessions" in docs/database-reference.md.
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Optimistic: signed-out visitors to a role area go to sign in and come back afterwards.
  // The role itself is checked on the server in every page and Server Function (src/server/session.ts).
  // /apply is public (it explains who can apply) but needs an account; checking here gives a real redirect.
  if (!signedIn && (isProtectedPath(pathname) || pathname === "/apply")) {
    const redirect = NextResponse.redirect(new URL(signInUrlFor(pathname + search), request.url));
    response().cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // One address per search. The home page budget band, comma lists and junk go to the canonical URL here,
  // before the page streams, so it is a real redirect. The page repeats the check for unknown institutions.
  // Only for full page loads: router fetches carry an internal _rsc parameter and an RSC header, and
  // redirecting those would loop. Client navigation already uses canonical URLs (SearchLayout).
  if (pathname === "/listings" && !request.headers.has("rsc") && !request.nextUrl.searchParams.has("_rsc")) {
    const canonical = canonicalListingsUrl(request.nextUrl.searchParams);
    if (canonical) {
      const redirect = NextResponse.redirect(new URL(canonical, request.url), 307);
      response().cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }
  return response();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
