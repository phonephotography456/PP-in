import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withAnon } from "@/db/with-anon";
import { findListing, findService, profileRouteExists } from "@/lib/resolve";

type Role = "customer" | "photographer" | "admin";
const HOME: Record<Role, string> = { admin: "/admin/dashboard", photographer: "/photographer/dashboard", customer: "/" };

// Protected prefix -> required role + where to send anonymous visitors.
const AREAS: { prefix: string; role: Role; login: string }[] = [
  { prefix: "/admin", role: "admin", login: "/login" },
  { prefix: "/photographer", role: "photographer", login: "/photographer/login" },
  { prefix: "/reviewer", role: "customer", login: "/reviewer/login" },
];
// Public auth pages that live under a protected prefix.
const PUBLIC = /^\/(photographer|reviewer)\/(login|register|verify|forgot-password|reset-password)$/;

/**
 * Public dynamic routes whose slugs must exist. Pages stream after a static shell, so a notFound() thrown inside
 * them keeps HTTP 200; checking here, before any response starts, gives crawlers a real 404.
 * Returns true when the path is a valid public page (or not one of these routes).
 */
async function publicRouteExists(pathname: string) {
  const seg = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [root, a, b, c, d] = seg;
  try {
    if (root === "services" && a && !b) return !!(await withAnon((tx) => findService(tx, a)));
    if (root !== "photographers" || !a) return true;
    if (a === "p") return !b || !!c ? false : await withAnon((tx) => profileRouteExists(tx, b));
    if (d) return false;
    return !!(await withAnon((tx) => findListing(tx, a, b, c)));
  } catch {
    return true; // a database hiccup must not turn valid pages into 404s: let the page decide
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // A photographer has a single page. Old per-service URLs (/photographers/p/<slug>/<service>) redirect to it.
  const old = pathname.match(/^\/photographers\/p\/([^/]+)\/([^/]+)\/?$/);
  if (old) return NextResponse.redirect(new URL(`/photographers/p/${old[1]}?service=${old[2]}`, request.url), 308);
  if ((pathname.startsWith("/services/") || pathname.startsWith("/photographers/")) && !(await publicRouteExists(pathname))) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (!area || PUBLIC.test(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() validates the JWT with Supabase Auth; getSession() would trust the cookie.
  const { data } = await supabase.auth.getUser();
  const role = data.user?.app_metadata?.role as Role | undefined;
  if (!data.user) return NextResponse.redirect(new URL(area.login, request.url));
  if (role !== area.role) return NextResponse.redirect(new URL(role ? HOME[role] : area.login, request.url));
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/photographer/:path*", "/reviewer/:path*", "/services/:path*", "/photographers/:path*"],
};
