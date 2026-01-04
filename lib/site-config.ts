import { unstable_cache as cache } from "next/cache";
import type { Address, SiteConfig as PrismaSiteConfig } from "@prisma/client";
import { fallbackContact } from "@/lib/data/site-contact";
import { prisma } from "@/lib/prisma";

export type SiteContact = {
  name?: string | null;
  ownerName?: string | null;
  siret?: string | null;
  ape?: string | null;
  phone: string;
  email: string;
  address: Pick<Address, "street" | "streetNumber" | "postalCode" | "city" | "country">;
};

type SiteConfigWithExtras = PrismaSiteConfig & { siret?: string | null; ape?: string | null };

export const getSiteContact = cache(
  async (): Promise<SiteContact> => {
    try {
      const cfg = (await prisma.siteConfig.findFirst({
        include: { address: true },
      })) as (SiteConfigWithExtras & { address: Address }) | null;
      if (!cfg || !cfg.address) return fallbackContact;
      return {
        name: cfg.name ?? fallbackContact.name ?? "",
        ownerName: cfg.ownerName ?? fallbackContact.ownerName ?? "",
        siret: cfg.siret ?? fallbackContact.siret ?? "",
        ape: cfg.ape ?? fallbackContact.ape ?? "",
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
