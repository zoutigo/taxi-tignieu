import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone ?? null;
        const adminList =
          process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
        if (user.email && adminList.includes(user.email.toLowerCase())) {
          token.isAdmin = true;
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
        },
      });

      if (!user) {
        return session;
      }

      session.user.id = user.id;
      session.user.email = user.email ?? session.user.email;
      session.user.name = user.name ?? session.user.name;
      session.user.phone = user.phone ?? null;
      session.user.isAdmin = Boolean((token as unknown as { isAdmin?: boolean }).isAdmin);

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
