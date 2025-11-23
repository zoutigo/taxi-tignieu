import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      phone?: string | null;
      isAdmin?: boolean;
      isManager?: boolean;
      isDriver?: boolean;
    };
  }

  interface User {
    phone?: string | null;
    isAdmin?: boolean;
    isManager?: boolean;
    isDriver?: boolean;
  }
}
