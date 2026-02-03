import { POST as geocodePost } from "@/app/api/forecast/geocode/route";
const makeRequest = (body: { address: string }) =>
  new Request("http://localhost/api/forecast/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("api/forecast/geocode", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch as typeof fetch;
  });

  it("returns 400 when address is missing or too short", async () => {
    const res = await geocodePost(makeRequest({ address: "ab" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Adresse requise/);
  });

  it("returns 500 when GOOGLE_MAPS_API_KEY is missing", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "";
    const res = await geocodePost(makeRequest({ address: "10 rue de la Paix, Paris" }));
    expect(res.status).toBe(500);
  });

  it("maps a successful Google response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [
          {
            formatted_address: "10 Rue de la Paix, 75002 Paris, France",
            geometry: { location: { lat: 48.8686, lng: 2.332 } },
            place_id: "place-123",
            address_components: [
              { long_name: "10", short_name: "10", types: ["street_number"] },
              { long_name: "Rue de la Paix", short_name: "Rue de la Paix", types: ["route"] },
              { long_name: "75002", short_name: "75002", types: ["postal_code"] },
              { long_name: "Paris", short_name: "Paris", types: ["locality"] },
              { long_name: "France", short_name: "FR", types: ["country"] },
            ],
          },
        ],
      }),
    } as unknown as typeof fetch);

    const res = await geocodePost(makeRequest({ address: "10 rue de la Paix Paris" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results[0].formatted_address).toContain("10 Rue de la Paix");
    expect(json.results[0].lat).toBeCloseTo(48.8686);
    expect(json.results[0].postcode).toBe("75002");
    expect(json.results[0].city).toBe("Paris");
  });

  it("returns 404 on ZERO_RESULTS", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    } as unknown as typeof fetch);

    const res = await geocodePost(makeRequest({ address: "unknown" }));
    expect(res.status).toBe(404);
  });

  it("returns 502 on OVER_QUERY_LIMIT", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "OVER_QUERY_LIMIT" }),
    } as unknown as typeof fetch);

    const res = await geocodePost(makeRequest({ address: "10 rue" }));
    expect(res.status).toBe(502);
  });
});
