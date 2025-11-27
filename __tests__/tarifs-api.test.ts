import { GET as searchGet } from "@/app/api/tarifs/search/route";
import { GET as geocodeGet } from "@/app/api/tarifs/geocode/route";
import { POST as quotePost } from "@/app/api/tarifs/quote/route";

describe("tarifs APIs", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const makeRequest = (url: string, method: "GET" | "POST" = "GET", body?: unknown) =>
    new Request(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { "Content-Type": "application/json" },
    });

  it("search: retourne des suggestions avec ville/CP et tolère la normalisation", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: { label: "Gare Part-Dieu", city: "Lyon", postcode: "69003" },
            geometry: { coordinates: [4.85, 45.76] },
          },
        ],
      }),
    } as unknown as typeof fetch);

    const res = await searchGet(makeRequest("http://localhost/api/tarifs/search?q=lyon pardieu"));
    const payload = await res.json();

    expect(payload.results[0].label).toContain("Gare Part-Dieu");
    expect(payload.results[0].city).toBe("Lyon");
    expect(payload.results[0].postcode).toBe("69003");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("geocode: renvoie la première coordonnée", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { geometry: { coordinates: [4.8, 45.75] }, properties: { label: "Adresse test" } },
        ],
      }),
    } as unknown as typeof fetch);

    const res = await geocodeGet(makeRequest("http://localhost/api/tarifs/geocode?q=test"));
    const payload = await res.json();
    expect(payload.lat).toBe(45.75);
    expect(payload.lng).toBe(4.8);
  });

  it("quote: calcule distance et prix à partir du summary routes", async () => {
    process.env.OPENROUTESERVICE_API_KEY = "test-key";
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("openrouteservice")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            JSON.stringify({
              routes: [{ summary: { distance: 10000, duration: 900 } }],
            }),
        }) as unknown as Response;
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response;
    });

    const res = await quotePost(
      makeRequest("http://localhost/api/tarifs/quote", "POST", {
        from: { lat: 45.75, lng: 4.85 },
        to: { lat: 45.78, lng: 4.9 },
        tariff: "A",
        baggageCount: 1,
        fifthPassenger: true,
        waitMinutes: 10,
      })
    );
    const payload = await res.json();
    expect(payload.distanceKm).toBeCloseTo(10);
    expect(payload.price).toBeGreaterThan(0);
  });
});
