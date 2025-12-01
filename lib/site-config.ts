import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type SiteContact = {
  phone: string;
  email: string;
  address: {
    street: string;
    streetNumber?: string | null;
    postalCode: string;
    city: string;
    country: string;
  };
};

const fallbackContact: SiteContact = {
  phone: "04 95 78 54 00",
  email: "contact@taxitignieu.fr",
  address: {
    street: "Rue de la République",
    streetNumber: "9",
    postalCode: "38230",
    city: "Tignieu-Jameyzieu",
    country: "France",
  },
};

export const getSiteContact = cache(
  async (): Promise<SiteContact> => {
    try {
      const cfg = await prisma.siteConfig.findFirst({
        include: { address: true },
      });
      if (!cfg || !cfg.address) return fallbackContact;
      return {
        phone: cfg.phone ?? "",
        email: cfg.email ?? "",
        address: {
          street: cfg.address.street ?? "",
          streetNumber: cfg.address.streetNumber ?? "",
          postalCode: cfg.address.postalCode ?? "",
          city: cfg.address.city ?? "",
          country: cfg.address.country ?? "",
        },
      };
    } catch {
      return fallbackContact;
    }
  },
  ["site-config"],
  { revalidate: 3600, tags: ["site-config"] } // cache for 1h unless revalidated
);
