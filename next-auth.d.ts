import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      phone?: string | null;
    };
  }

  interface User {
    phone?: string | null;
  }
}
