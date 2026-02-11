/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import { Prisma } from "@prisma/client";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
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

describe("Landing page – carte Trajet type", () => {
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

  it("affiche les données issues de l'API quand un trajet type est disponible", async () => {
    mockedGetPublicFeaturedTypeTrips.mockResolvedValue([
      {
        id: "trip-1",
        slug: "trip-1",
        title: "API Titre",
        summary: "API résumé",
        featuredSlot: "TYPE",
        pickupLabel: "Tignieu",
        dropoffLabel: "Aéroport Lyon",
        distanceKm: new Prisma.Decimal(25),
        durationMinutes: 35,
        basePriceCents: 4200,
        badge: "API badge",
        zoneLabel: null,
        priority: 0,
        active: true,
      },
    ]);

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("API Titre");
    expect(html).toContain("API résumé");
    expect(html).toContain("42 €");
    expect(html).toContain("API badge");
  });

  it("utilise le fallback statique quand l'API ne renvoie rien", async () => {
    mockedGetPublicFeaturedTypeTrips.mockResolvedValue([]);
    mockedGetPublicFeaturedZoneTrips.mockResolvedValue([]);

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Tignieu → Aéroport");
    expect(html).toContain("35 €");
    expect(html).toContain("Tarif indicatif journée");
  });
});
