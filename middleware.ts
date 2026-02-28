import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isBlockedPath } from "@/lib/security-paths";

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;

  if (isBlockedPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const needsAuth =
    pathname.startsWith("/espace-client") || pathname.startsWith("/profil/completer-telephone");

  const isInactive = req.auth?.user && req.auth.user.isActive === false;
  if (needsAuth && (!req.auth || isInactive)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/espace-client/:path*",
    "/profil/completer-telephone",
    "/.env",
    "/.env/:path*",
    "/bin",
    "/bin/:path*",
    "/.git",
    "/.git/:path*",
    "/api/live/ws",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/xmlrpc.php",
  ],
};
