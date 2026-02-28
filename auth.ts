import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    "AUTH_GOOGLE_ID ou AUTH_GOOGLE_SECRET manquants. L'authentification Google ne fonctionnera pas tant que ces variables ne sont pas définies."
  );
}

const authResult = NextAuth({
  debug: true,
  logger: {
    error(code, ...message) {
      console.error("NEXTAUTH_ERROR", code, message);
    },
    warn(code, ...message) {
      console.warn("NEXTAUTH_WARN", code, message);
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      const userId = (user as { id?: string | null } | null)?.id ?? null;
      const userEmail = user?.email ?? null;
      if (!userId && !userEmail) return true;

      const existing = await prisma.user.findFirst({
        where: userId
          ? { id: userId }
          : {
              email: userEmail ?? undefined,
            },
        select: { isActive: true },
      });
      if (!existing) return true;
      return Boolean(existing.isActive);
    },
    async jwt({ token, user, trigger, session, account, profile }) {
      if (user) {
        token.id = typeof user.id === "string" ? user.id : null;
        token.phone = user.phone ?? null;
        token.isActive = (user as { isActive?: boolean } | null)?.isActive ?? true;
        token.picture =
          (account as { picture?: string } | null)?.picture ??
          (profile as { picture?: string } | null)?.picture ??
          (user as { image?: string } | null)?.image ??
          null;
        const adminList =
          process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
        const managerList =
          process.env.MANAGER_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
        const driverList =
          process.env.DRIVER_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];

        if (user.email) {
          const lower = user.email.toLowerCase();
          const active = (user as { isActive?: boolean } | null)?.isActive ?? true;
          token.isAdmin = Boolean(active && (user.isAdmin || adminList.includes(lower)));
          token.isManager = Boolean(active && (user.isManager || managerList.includes(lower)));
          token.isDriver = Boolean(active && (user.isDriver || driverList.includes(lower)));
        } else {
          const active = (user as { isActive?: boolean } | null)?.isActive ?? true;
          token.isAdmin = Boolean(active && user.isAdmin);
          token.isManager = Boolean(active && user.isManager);
          token.isDriver = Boolean(active && user.isDriver);
        }
      }
      if (trigger === "update" && session?.phone !== undefined) {
        token.phone = session.phone;
      }
      return token;
    },
    async session({ session, token }) {
      const tokenId =
        typeof (token as { id?: unknown }).id === "string"
          ? ((token as { id?: string }).id ?? null)
          : null;
      const tokenSub = typeof token.sub === "string" ? token.sub : null;
      const sessionUserId = typeof session.user?.id === "string" ? session.user.id : null;
      const userId = tokenId ?? tokenSub ?? sessionUserId;
      if (!session.user || !userId) {
        return session;
      }

      // Avoid Prisma on edge runtime (e.g., middleware) to keep auth compatible there.
      if (process.env.NEXT_RUNTIME === "edge") {
        session.user.id = userId;
        session.user.email = session.user.email ?? (token.email as string | null);
        session.user.name = session.user.name ?? (token.name as string | null);
        session.user.phone = (token.phone as string | null) ?? null;
        return session;
      }

      let user: {
        id: string;
        email: string | null;
        name: string | null;
        phone: string | null;
        image: string | null;
        isAdmin: boolean;
        isManager: boolean;
        isDriver: boolean;
        isActive: boolean;
      } | null = null;
      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            image: true,
            isAdmin: true,
            isManager: true,
            isDriver: true,
            isActive: true,
          },
        });
      } catch (error) {
        console.warn("AUTH_SESSION_LOOKUP_FAILED", { userId, error });
        return session;
      }

      if (!user) {
        return session;
      }

      if (!user.isActive) {
        session.user.id = user.id;
        session.user.email = user.email ?? session.user.email;
        session.user.name = user.name ?? session.user.name;
        session.user.phone = null;
        session.user.isActive = false;
        session.user.isAdmin = false;
        session.user.isManager = false;
        session.user.isDriver = false;
        return session;
      }

      session.user.id = user.id;
      session.user.email = user.email ?? session.user.email;
      session.user.name = user.name ?? session.user.name;
      session.user.phone = user.phone ?? null;
      const tokenPicture = (token as unknown as { picture?: string | null }).picture ?? null;
      const imageToUse = user.image ?? tokenPicture ?? session.user.image ?? null;
      session.user.image = imageToUse;
      if (!user.image && tokenPicture) {
        void prisma.user
          .update({ where: { id: user.id }, data: { image: tokenPicture } })
          .catch(() => {});
      }
      session.user.isAdmin = Boolean(
        (token as unknown as { isAdmin?: boolean }).isAdmin ?? user.isAdmin
      );
      session.user.isManager = Boolean(
        (token as unknown as { isManager?: boolean }).isManager ?? user.isManager
      );
      session.user.isDriver = Boolean(
        (token as unknown as { isDriver?: boolean }).isDriver ?? user.isDriver
      );
      session.user.isActive = Boolean(
        (token as unknown as { isActive?: boolean }).isActive ?? user.isActive
      );

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return url;
        }
      } catch {
        // ignore parsing errors and fallback below
      }
      return baseUrl;
    },
  },
});

export const { auth, handlers, signIn, signOut } = authResult;
export const { GET, POST } = handlers;
