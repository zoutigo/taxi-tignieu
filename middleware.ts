export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/espace-client/:path*", "/profil/completer-telephone"],
};
