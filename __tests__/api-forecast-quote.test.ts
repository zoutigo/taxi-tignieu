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
  const fetchMock = jest.fn();
  const envBackup = process.env.OPENROUTESERVICE_API_KEY;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.OPENROUTESERVICE_API_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          features: [{ properties: { summary: { distance: 12340, duration: 1500 } } }],
        }),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    mockComputePrice.mockReturnValue(10);
  });

  afterAll(() => {
    if (envBackup === undefined) delete process.env.OPENROUTESERVICE_API_KEY;
    else process.env.OPENROUTESERVICE_API_KEY = envBackup;
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

  it("utilise strictement ORS et appelle computePriceEuros avec les bons paramètres", async () => {
    const res = await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 46, lng: 6 },
      passengers: 3,
      baggageCount: 2,
      waitMinutes: 4,
      date: "2026-02-13",
      time: "12:00",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.distanceKm).toBeCloseTo(12.34);
    expect(json.durationMinutes).toBe(25);
    expect(json.price).toBe(10); // valeur mockée
    expect(json.source).toBe("ors");
    expect(mockComputePrice).toHaveBeenCalledWith(
      12.34,
      "C",
      expect.objectContaining({
        baggageCount: 2,
        fifthPassenger: false,
        waitMinutes: 4,
      }),
      undefined
    );
  });

  it("clamp négatifs et marque fifthPassenger selon passengers", async () => {
    const res = await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 46, lng: 7 },
      passengers: -2,
      baggageCount: -3,
      waitMinutes: -1,
      date: "2026-02-13",
      time: "01:16",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.distanceKm).toBeCloseTo(12.34);
    expect(json.durationMinutes).toBeGreaterThan(0);
    expect(mockComputePrice).toHaveBeenCalledWith(
      12.34,
      "D",
      expect.objectContaining({
        baggageCount: 1,
        fifthPassenger: false,
        waitMinutes: 0,
      }),
      undefined
    );
  });

  it("déclenche fifthPassenger quand passengers > 4 et applique tarif nuit D", async () => {
    await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 45.5, lng: 5.5 },
      passengers: 5,
      baggageCount: 1,
      date: "2026-02-13",
      time: "23:00",
    });

    expect(mockComputePrice).toHaveBeenCalledWith(
      12.34,
      "D",
      expect.objectContaining({ fifthPassenger: true }),
      undefined
    );
  });

  it("force au moins 1 bagage même si bagage/luggage absent", async () => {
    await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 45.5, lng: 5.5 },
      date: "2026-02-13",
      time: "12:00",
    });

    expect(mockComputePrice).toHaveBeenCalledWith(
      12.34,
      "C",
      expect.objectContaining({ baggageCount: 1 }),
      undefined
    );
  });

  it("500 si clé ORS manquante", async () => {
    delete process.env.OPENROUTESERVICE_API_KEY;
    const res = await run({
      pickup: { lat: 45, lng: 5 },
      dropoff: { lat: 46, lng: 6 },
    });
    expect(res.status).toBe(500);
  });
});
