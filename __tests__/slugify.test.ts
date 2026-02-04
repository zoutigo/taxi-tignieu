import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("normalise accents, spaces and punctuation", () => {
    expect(slugify("Tignieu-Jameyzieu")).toBe("tignieu-jameyzieu");
    expect(slugify("  Àéî ôù ")).toBe("aei-ou");
    expect(slugify("Route d'Aéroport 23")).toBe("route-d-aeroport-23");
  });

  it("returns fallback when empty", () => {
    expect(slugify("")).toBe("trajet");
    expect(slugify("   ")).toBe("trajet");
  });
});
