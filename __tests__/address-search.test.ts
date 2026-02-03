/** @jest-environment jsdom */

import { fetchAddressSuggestions, normalizeAddressSuggestion } from "@/lib/address-search";
import type { AddressData } from "@/lib/booking-utils";

const base: AddressData = {
  label: "114 route de cremieu",
  lat: 1,
  lng: 1,
  street: "114 route de cremieu",
  streetNumber: "114",
  postcode: "38230",
  city: "Tignieu-Jameyzieu",
  country: "France",
};

describe("address-search helpers", () => {
  beforeEach(() => {
    // @ts-expect-error mock fetch
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith("/api/forecast/geocode")) {
        const geo: AddressData = {
          label: "Centre Commercial E.Leclerc Tignieu-Jameyzieu, France",
          lat: 45.74,
          lng: 5.17,
          street: "Avenue du Commerce",
          streetNumber: "1",
          postcode: "38230",
          city: "Tignieu-Jameyzieu",
          country: "France",
        };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [geo] }),
        }) as unknown as Response;
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      }) as unknown as Response;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("normalizes street without duplicating the number", () => {
    const normalized = normalizeAddressSuggestion({
      ...base,
      street: "114 114 route de cremieu",
    });
    expect(normalized.street).toBe("route de cremieu");
    expect(normalized.streetNumber).toBe("114");
  });

  it("filters suggestions to unique, with city and postcode, and limited to 5", async () => {
    const suggestions = await fetchAddressSuggestions("114 route de cremieu");
    expect(suggestions.length).toBeGreaterThan(0);
    const uniques = new Set(suggestions.map((s) => `${s.label}-${s.lat}-${s.lng}`));
    expect(uniques.size).toBe(suggestions.length);
    expect(suggestions.every((s) => s.city || s.postcode)).toBe(true);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(suggestions.every((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))).toBe(true);
  });

  it("falls back to geocode when search returns no results", async () => {
    const suggestions = await fetchAddressSuggestions("leclerc tignieu");
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].city).toBe("Tignieu-Jameyzieu");
    expect(suggestions[0].postcode).toBe("38230");
    expect(suggestions[0].street?.toLowerCase()).toContain("commerce");
  });
});
