export type TariffCode = "A" | "B" | "C" | "D";

export const baseChargeEuros = 2.8;
export const baggageFeeEuros = 2;
export const fifthPassengerFeeEuros = 2.5;
export const waitPerHourEuros = 29.4;

const perKm: Record<TariffCode, number> = {
  A: 0.98,
  B: 1.23,
  C: 1.96,
  D: 2.46,
};

export type QuoteExtras = {
  fifthPassenger?: boolean;
  baggageCount?: number;
  waitMinutes?: number;
};

export function computePriceEuros(
  distanceKm: number,
  tariff: TariffCode,
  extras: QuoteExtras = {}
): number {
  const kmRate = perKm[tariff];
  const waitMinutes = extras.waitMinutes ?? 0;
  const baggageCount = extras.baggageCount ?? 0;
  const fifthPassenger = extras.fifthPassenger ?? false;

  const waitCost = (waitMinutes / 60) * waitPerHourEuros;
  const extrasCost = baggageCount * baggageFeeEuros + (fifthPassenger ? fifthPassengerFeeEuros : 0);
  const total = baseChargeEuros + distanceKm * kmRate + waitCost + extrasCost;
  return Math.max(0, Math.round(total * 100) / 100);
}
