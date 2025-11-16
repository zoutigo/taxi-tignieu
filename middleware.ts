import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async (req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isProtectedArea = pathname.startsWith("/espace-client");
  const isPhoneCompletion = pathname.startsWith("/profil/completer-telephone");

  if (!req.auth) {
    if (isProtectedArea || isPhoneCompletion) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  const hasPhone = Boolean(req.auth.user?.phone);

  if (!hasPhone && isProtectedArea && !isPhoneCompletion) {
    const target = new URL("/profil/completer-telephone", req.nextUrl.origin);
    if (pathname !== "/espace-client") {
      target.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(target);
  }

  if (hasPhone && isPhoneCompletion) {
    const destination = searchParams.get("from") ?? "/espace-client";
    return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/espace-client/:path*", "/profil/completer-telephone"],
};
