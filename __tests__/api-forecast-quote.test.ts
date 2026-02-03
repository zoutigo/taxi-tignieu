/** @jest-environment node */
import { POST } from "@/app/api/forecast/quote/route";
import { computePriceEuros } from "@/lib/tarifs";

jest.mock("@/lib/tarifs", () => ({
  computePriceEuros: jest.fn(),
  __esModule: true,
}));

jest.mock("@/lib/tariff-config", () => ({
  getTariffConfig: jest.fn().mockResolvedValue({}),
  __esModule: true,
}));

const mockComputePrice = jest.mocked(computePriceEuros);

describe("api/forecast/quote", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockComputePrice.mockReturnValue(10);
  });

  const run = (body: unknown) =>
    POST(
      new Request("http://localhost/api/forecast/quote", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      })
    );

  it("400 si coordonnées manquantes", async () => {
    const res = await run({ pickup: null, dropoff: null });
    expect(res.status).toBe(400);
  });

  it("400 si coordonnées invalides", async () => {
    const res = await run({
      pickup: { lat: "NaN", lng: 1 },
      dropoff: { lat: 2, lng: 3 },
      distanceKm: 1,
    });
    expect(res.status).toBe(400);
  });

  it("utilise la distance fournie et appelle computePriceEuros avec les bons paramètres", async () => {
    const res = await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 46, lng: 6 },
      distanceKm: 12.34,
      durationMinutes: 25,
      passengers: 3,
      baggageCount: 2,
      waitMinutes: 4,
      tariff: "B",
      date: "2026-02-13",
      time: "12:00",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.distanceKm).toBeCloseTo(12.34);
    expect(json.durationMinutes).toBe(25);
    expect(json.price).toBe(10); // valeur mockée
    expect(mockComputePrice).toHaveBeenCalledWith(
      12.34,
      "B",
      expect.objectContaining({
        baggageCount: 2,
        fifthPassenger: false,
        waitMinutes: 4,
      }),
      undefined
    );
  });

  it("clamp négatifs, calcule haversine si distance absente et marque fifthPassenger quand >4", async () => {
    // ~157 km entre ces deux points => on s'assure que la distance est calculée
    const res = await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 46, lng: 7 },
      passengers: -2,
      baggageCount: -3,
      waitMinutes: -1,
      tariff: "A",
      date: "2026-02-13",
      time: "01:16",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.distanceKm).toBeGreaterThan(100);
    expect(json.durationMinutes).toBeGreaterThan(0);
    expect(mockComputePrice).toHaveBeenCalledWith(
      expect.any(Number),
      "A",
      expect.objectContaining({
        baggageCount: 0,
        fifthPassenger: false,
        waitMinutes: 0,
      }),
      undefined
    );
  });

  it("déclenche fifthPassenger quand passengers > 4", async () => {
    await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 45.5, lng: 5.5 },
      distanceKm: 5,
      passengers: 5,
      baggageCount: 1,
      tariff: "C",
      date: "2026-02-13",
      time: "23:00",
    });

    expect(mockComputePrice).toHaveBeenCalledWith(
      5,
      "C",
      expect.objectContaining({ fifthPassenger: true }),
      undefined
    );
  });
});
