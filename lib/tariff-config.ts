import { prisma } from "@/lib/prisma";
import { defaultTariffConfig, type TariffConfigValues } from "./tarifs";

export async function getTariffConfig(): Promise<TariffConfigValues> {
  const config = await prisma.tariffConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!config) return defaultTariffConfig;

  return {
    baseChargeCents: config.baseChargeCents,
    kmCentsA: config.kmCentsA,
    kmCentsB: config.kmCentsB,
    kmCentsC: config.kmCentsC,
    kmCentsD: config.kmCentsD,
    waitPerHourCents: config.waitPerHourCents,
    baggageFeeCents: config.baggageFeeCents,
    fifthPassengerCents: config.fifthPassengerCents,
  };
}
