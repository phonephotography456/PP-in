import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/admin/:path*", "/photographer/:path*", "/reviewer/:path*"],
};
