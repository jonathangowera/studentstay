import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isProtectedPath, signInUrlFor } from "@/lib/auth/roles";

export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Optimistic: signed-out visitors to a role area go to sign in and come back afterwards.
  // The role itself is checked on the server in every page and Server Function (src/server/session.ts).
  if (!signedIn && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(signInUrlFor(pathname + search), request.url));
    response().cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
