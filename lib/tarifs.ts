export type TariffCode = "A" | "B" | "C" | "D";

export const defaultTariffConfig = {
  baseChargeCents: 280,
  kmCentsA: 98,
  kmCentsB: 123,
  kmCentsC: 196,
  kmCentsD: 246,
  waitPerHourCents: 2940,
  baggageFeeCents: 200,
  fifthPassengerCents: 250,
};

export type TariffConfigValues = typeof defaultTariffConfig;

export type QuoteExtras = {
  fifthPassenger?: boolean;
  baggageCount?: number;
  waitMinutes?: number;
};

export function computePriceEuros(
  distanceKm: number,
  tariff: TariffCode,
  extras: QuoteExtras = {},
  config: TariffConfigValues = defaultTariffConfig
): number {
  const perKm: Record<TariffCode, number> = {
    A: config.kmCentsA / 100,
    B: config.kmCentsB / 100,
    C: config.kmCentsC / 100,
    D: config.kmCentsD / 100,
  };
  const baseCharge = config.baseChargeCents / 100;
  const baggageFee = config.baggageFeeCents / 100;
  const fifthFee = config.fifthPassengerCents / 100;
  const waitPerHour = config.waitPerHourCents / 100;

  const kmRate = perKm[tariff];
  const waitMinutes = extras.waitMinutes ?? 0;
  const baggageCount = extras.baggageCount ?? 0;
  const fifthPassenger = extras.fifthPassenger ?? false;

  const waitCost = (waitMinutes / 60) * waitPerHour;
  const extrasCost = baggageCount * baggageFee + (fifthPassenger ? fifthFee : 0);
  const total = baseCharge + distanceKm * kmRate + waitCost + extrasCost;
  return Math.max(0, Math.round(total * 100) / 100);
}
