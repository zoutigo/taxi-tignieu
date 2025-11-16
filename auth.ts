import NextAuth from "next-auth";
import type { User } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "@auth/core/providers";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  console.warn(
    "AUTH_GOOGLE_ID ou AUTH_GOOGLE_SECRET manquants. L'authentification Google ne fonctionnera pas tant que ces variables ne sont pas définies."
  );
}

const providers: Provider[] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }),
];

const e2eUserId = process.env.AUTH_E2E_TEST_USER_ID;
const e2eUserEmail = process.env.AUTH_E2E_TEST_USER_EMAIL ?? "e2e@example.com";
const e2eUserName = process.env.AUTH_E2E_TEST_USER_NAME ?? "Utilisateur E2E";

if (e2eUserId) {
  providers.push(
    Credentials({
      id: "mock-google",
      name: "Mock Google",
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Nom", type: "text" },
      },
      async authorize(credentials) {
        if (!e2eUserId) {
          return null;
        }
        const email = (credentials?.email as string | undefined) ?? e2eUserEmail;
        const name = (credentials?.name as string | undefined) ?? e2eUserName;

        const user: User = {
          id: e2eUserId,
          email,
          name,
          phone: null,
        };

        return user;
      },
    })
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers,
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
      }
      if (trigger === "update" && session?.phone !== undefined) {
        token.phone = session.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? session.user.id;
        session.user.phone = (token.phone as string | null) ?? null;
      }
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
