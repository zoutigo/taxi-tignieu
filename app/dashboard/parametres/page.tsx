import { prisma } from "@/lib/prisma";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { defaultTariffConfig } from "@/lib/tarifs";

export default async function DashboardSettingsPage() {
  const config = await prisma.siteConfig.findFirst({
    include: { address: true },
  });
  const tariff = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });

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
          initialTariff={
            tariff
              ? {
                  baseCharge: tariff.baseChargeCents / 100,
                  kmA: tariff.kmCentsA / 100,
                  kmB: tariff.kmCentsB / 100,
                  kmC: tariff.kmCentsC / 100,
                  kmD: tariff.kmCentsD / 100,
                  waitPerHour: tariff.waitPerHourCents / 100,
                  baggageFee: tariff.baggageFeeCents / 100,
                  fifthPassenger: tariff.fifthPassengerCents / 100,
                }
              : {
                  baseCharge: defaultTariffConfig.baseChargeCents / 100,
                  kmA: defaultTariffConfig.kmCentsA / 100,
                  kmB: defaultTariffConfig.kmCentsB / 100,
                  kmC: defaultTariffConfig.kmCentsC / 100,
                  kmD: defaultTariffConfig.kmCentsD / 100,
                  waitPerHour: defaultTariffConfig.waitPerHourCents / 100,
                  baggageFee: defaultTariffConfig.baggageFeeCents / 100,
                  fifthPassenger: defaultTariffConfig.fifthPassengerCents / 100,
                }
          }
        />
      </div>
    </div>
  );
}
