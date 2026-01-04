import { prisma } from "@/lib/prisma";
import { SiteInfoPanel } from "@/components/dashboard/site-info-panel";
import type { Address, SiteConfig } from "@prisma/client";
import { BackButton } from "@/components/back-button";

export default async function SiteInfoPage() {
  const config = (await prisma.siteConfig.findFirst({
    include: { address: true },
  })) as (SiteConfig & { address: Address; siret?: string | null; ape?: string | null }) | null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Informations du site</h1>
      <p className="text-sm text-muted-foreground">
        Mettez à jour le nom du site, le responsable et les coordonnées affichées aux visiteurs.
      </p>
      <div className="mt-4">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
      <div className="mt-6">
        <SiteInfoPanel
          initialContact={
            config && config.address
              ? {
                  name: config.name ?? "",
                  ownerName: config.ownerName ?? "",
                  siret: config.siret ?? "",
                  ape: config.ape ?? "",
                  phone: config.phone ?? "",
                  email: config.email ?? "",
                  address: {
                    street: config.address.street ?? "",
                    streetNumber: config.address.streetNumber ?? "",
                    postalCode: config.address.postalCode ?? "",
                    city: config.address.city ?? "",
                    country: config.address.country ?? "",
                    latitude: config.address.latitude ?? undefined,
                    longitude: config.address.longitude ?? undefined,
                  },
                }
              : null
          }
        />
      </div>

      <div className="mt-8">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
    </div>
  );
}
