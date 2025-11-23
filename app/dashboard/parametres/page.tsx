import { prisma } from "@/lib/prisma";
import { SettingsPanel } from "@/components/dashboard/settings-panel";

export default async function DashboardSettingsPage() {
  const config = await prisma.siteConfig.findFirst({
    include: { address: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
      <p className="text-sm text-muted-foreground">
        Configurez la pagination des tableaux et les informations de contact.
      </p>
      <div className="mt-6">
        <SettingsPanel
          initialContact={
            config && config.address
              ? {
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
    </div>
  );
}
