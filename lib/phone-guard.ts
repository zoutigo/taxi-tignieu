import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

export type AuthenticatedRequest = NextRequest & {
  auth?: Session | null;
};

export function phoneCompletionGuard(req: AuthenticatedRequest) {
  // This guard is no longer used in middleware (replaced by server-side checks).
  const { pathname, searchParams } = req.nextUrl;
  const isProtectedArea = pathname.startsWith("/espace-client");
  const isPhoneCompletion = pathname.startsWith("/profil/completer-telephone");

  if (!req.auth) {
    if (isProtectedArea || isPhoneCompletion) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Treat undefined as "unknown" so we don't force a redirect when the JWT is stale
  // (e.g., phone updated in DB but not yet on the token). Only explicit null/empty should trigger it.
  const phone = req.auth.user?.phone;
  const hasPhone = phone !== null && phone !== "";

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
}
