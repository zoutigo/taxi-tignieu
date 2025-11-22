import { auth } from "@/auth";
import { phoneCompletionGuard } from "@/lib/phone-guard";

export default auth(phoneCompletionGuard);

export const config = {
  matcher: ["/espace-client/:path*", "/profil/completer-telephone"],
};
