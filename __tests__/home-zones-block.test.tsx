/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
import { cities } from "@/lib/data/cities";

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

describe("Landing page – bloc Zones desservies", () => {
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

  it("affiche les zones provenant de l'API avec leurs prix", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes("slot=TYPE")) {
        return makeResponse({ trips: [] }); // non utilisé ici
      }
      if (url.includes("slot=ZONE")) {
        return makeResponse({
          trips: [
            {
              slug: "zone-api",
              title: "Zone API",
              summary: "Sous-titre API",
              pickupLabel: "Pickup API",
              poiDestinations: [
                { label: "Aéroport Lyon", priceCents: 3500 },
                { label: "Gare Part-Dieu", priceCents: 4900 },
              ],
            },
          ],
        });
      }
      return makeResponse({});
    }) as any;

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Zone API");
    expect(html).toContain("Sous-titre API");
    expect(html).toContain("Aéroport Lyon");
    expect(html).toContain("35 €");
    expect(html).toContain("Gare Part-Dieu");
    expect(html).toContain("49 €");
  });

  it("retombe sur le fallback SSR quand l'API est vide", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes("slot=TYPE") || url.includes("slot=ZONE")) {
        return makeResponse({ trips: [] });
      }
      return makeResponse({});
    }) as any;

    const html = renderToStaticMarkup(await Home());

    // le fallback reprend les données de cities[]
    expect(html).toContain(cities[0].name);
    expect(html).toContain(cities[0].poiPrices[0].price);
    // au moins deux villes du fallback sont présentes
    expect(html).toContain(cities[1].name);
  });
});
