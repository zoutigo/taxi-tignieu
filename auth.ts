import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  console.warn(
    "AUTH_GOOGLE_ID ou AUTH_GOOGLE_SECRET manquants. L'authentification Google ne fonctionnera pas tant que ces variables ne sont pas définies."
  );
}

const authResult = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
    async jwt({ token, user, trigger, session, account, profile }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone ?? null;
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
          token.isAdmin = Boolean(user.isAdmin || adminList.includes(lower));
          token.isManager = Boolean(user.isManager || managerList.includes(lower));
          token.isDriver = Boolean(user.isDriver || driverList.includes(lower));
        } else {
          token.isAdmin = Boolean(user.isAdmin);
          token.isManager = Boolean(user.isManager);
          token.isDriver = Boolean(user.isDriver);
        }
      }
      if (trigger === "update" && session?.phone !== undefined) {
        token.phone = session.phone;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = (token.id as string) ?? token.sub ?? session.user?.id;
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

      const user = await prisma.user.findUnique({
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
        },
      });

      if (!user) {
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
