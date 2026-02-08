/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";

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

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedFaqFindMany = prisma.faq.findMany as unknown as jest.MockedFunction<
  typeof prisma.faq.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

const makeResponse = (data: any, ok = true) =>
  ({
    ok,
    json: async () => data,
  }) as Response;

describe("Landing page – carte Trajet type", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindMany.mockResolvedValue([]);
    mockedFaqFindMany.mockResolvedValue([]);
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

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("affiche les données issues de l'API quand un trajet type est disponible", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes("slot=TYPE")) {
        return makeResponse({
          trips: [
            {
              title: "API Titre",
              summary: "API résumé",
              pickupLabel: "Tignieu",
              dropoffLabel: "Aéroport Lyon",
              basePriceCents: 4200,
              distanceKm: 25,
              durationMinutes: 35,
              badge: "API badge",
            },
          ],
        });
      }
      if (url.includes("slot=ZONE")) {
        return makeResponse({ trips: [] });
      }
      return makeResponse({});
    }) as any;

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("API Titre");
    expect(html).toContain("API résumé");
    expect(html).toContain("42 €");
    expect(html).toContain("API badge");
  });

  it("utilise le fallback statique quand l'API ne renvoie rien", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes("slot=TYPE") || url.includes("slot=ZONE")) {
        return makeResponse({ trips: [] });
      }
      return makeResponse({});
    }) as any;

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Tignieu → Aéroport");
    expect(html).toContain("35 €");
    expect(html).toContain("Tarif indicatif journée");
  });
});
