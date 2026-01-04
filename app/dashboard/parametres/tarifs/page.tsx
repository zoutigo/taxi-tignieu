import { prisma } from "@/lib/prisma";
import { TariffPanel } from "@/components/dashboard/tariff-panel";
import { defaultTariffConfig } from "@/lib/tarifs";
import { BackButton } from "@/components/back-button";

export default async function TarifsPage() {
  const tariff = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });

  const initialTariff = tariff
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
      };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Paramètres tarifaires</h1>
      <p className="text-sm text-muted-foreground">
        Ajustez les valeurs utilisées pour les estimations de prix et la facturation.
      </p>
      <div className="mt-4">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
      <div className="mt-6">
        <TariffPanel initialTariff={initialTariff} />
      </div>

      <div className="mt-8">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
    </div>
  );
}
