/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
import { cities } from "@/lib/data/cities";
import {
  getPublicFeaturedTypeTrips,
  getPublicFeaturedZoneTrips,
} from "@/lib/featured-trips-public";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
    faq: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

jest.mock("@/lib/featured-trips-public", () => ({
  getPublicFeaturedTypeTrips: jest.fn(),
  getPublicFeaturedZoneTrips: jest.fn(),
}));

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedFaqFindMany = prisma.faq.findMany as unknown as jest.MockedFunction<
  typeof prisma.faq.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;
const mockedGetPublicFeaturedTypeTrips = getPublicFeaturedTypeTrips as jest.MockedFunction<
  typeof getPublicFeaturedTypeTrips
>;
const mockedGetPublicFeaturedZoneTrips = getPublicFeaturedZoneTrips as jest.MockedFunction<
  typeof getPublicFeaturedZoneTrips
>;

describe("Landing page – bloc Zones desservies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindMany.mockResolvedValue([]);
    mockedFaqFindMany.mockResolvedValue([]);
    mockedGetPublicFeaturedTypeTrips.mockResolvedValue([]);
    mockedGetPublicFeaturedZoneTrips.mockResolvedValue([]);
    mockedGetSiteContact.mockResolvedValue({
      phone: "04 95 78 54 00",
      email: "contact@test.fr",
      address: {
        street: "Rue des Champs",
        streetNumber: "10",
        postalCode: "38230",
        city: "Pont-de-Chéruy",
        country: "France",
      },
    });
  });

  it("affiche les zones provenant de l'API avec leurs prix", async () => {
    mockedGetPublicFeaturedZoneTrips.mockResolvedValue([
      {
        id: "zone-api-id",
        slug: "zone-api",
        title: "Zone API",
        summary: "Sous-titre API",
        featuredSlot: "ZONE",
        pickupLabel: "Pickup API",
        dropoffLabel: null,
        distanceKm: null,
        durationMinutes: null,
        basePriceCents: null,
        badge: null,
        zoneLabel: null,
        priority: 0,
        active: true,
        poiDestinations: [
          {
            id: "poi-1",
            label: "Aéroport Lyon",
            distanceKm: null,
            durationMinutes: null,
            priceCents: 3500,
            order: 0,
          },
          {
            id: "poi-2",
            label: "Gare Part-Dieu",
            distanceKm: null,
            durationMinutes: null,
            priceCents: 4900,
            order: 1,
          },
        ],
      },
    ]);

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Zone API");
    expect(html).toContain("Sous-titre API");
    expect(html).toContain("Aéroport Lyon");
    expect(html).toContain("35 €");
    expect(html).toContain("Gare Part-Dieu");
    expect(html).toContain("49 €");
  });

  it("retombe sur le fallback SSR quand l'API est vide", async () => {
    mockedGetPublicFeaturedTypeTrips.mockResolvedValue([]);
    mockedGetPublicFeaturedZoneTrips.mockResolvedValue([]);

    const html = renderToStaticMarkup(await Home());

    // le fallback reprend les données de cities[]
    expect(html).toContain(cities[0].name);
    expect(html).toContain(cities[0].poiPrices[0].price);
    // au moins deux villes du fallback sont présentes
    expect(html).toContain(cities[1].name);
  });
});
