import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

// NextAuth v5 session cookie names (HTTPS in production uses the __Secure- prefix).
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Legacy redirect: /dashboard was removed, send anyone hitting it to /requests.
  if (nextUrl.pathname === "/dashboard" || nextUrl.pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/requests", nextUrl));
  }

  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const hasSession = SESSION_COOKIE_NAMES.some((n) => req.cookies.has(n));

  if (!hasSession && !isPublic) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("from", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/requests", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
