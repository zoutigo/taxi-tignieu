import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  console.warn(
    "AUTH_GOOGLE_ID ou AUTH_GOOGLE_SECRET manquants. L'authentification Google ne fonctionnera pas tant que ces variables ne sont pas définies."
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  trustHost: true,
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    },
  },
});
