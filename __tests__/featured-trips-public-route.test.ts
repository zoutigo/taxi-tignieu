/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import * as handler from "@/app/api/featured-trips/public/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    featuredTrip: {
      findMany: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.featuredTrip.findMany as jest.MockedFunction<
  typeof prisma.featuredTrip.findMany
>;

describe("GET /api/featured-trips/public", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renvoie le slug et les POI quand withPrices=1", async () => {
    const trips = [
      {
        id: "trip-1",
        slug: "cremieu",
        title: "Crémieu",
        summary: "Navettes",
        featuredSlot: "ZONE",
        pickupLabel: "Crémieu",
        dropoffLabel: null,
        distanceKm: null,
        durationMinutes: null,
        basePriceCents: 4200,
        badge: "Zone desservie",
        zoneLabel: "Zone desservie",
        priority: 1,
        active: true,
        poiDestinations: [
          {
            id: "poi-1",
            label: "Aéroport",
            distanceKm: 30,
            durationMinutes: 35,
            priceCents: 4200,
            order: 0,
          },
        ],
      },
    ] as Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      featuredSlot: string;
      pickupLabel: string;
      dropoffLabel: string | null;
      distanceKm: number | null;
      durationMinutes: number | null;
      basePriceCents: number | null;
      badge: string | null;
      zoneLabel: string | null;
      priority: number;
      active: boolean;
      poiDestinations: Array<{
        id: string;
        label: string;
        distanceKm: number | null;
        durationMinutes: number | null;
        priceCents: number | null;
        order: number;
      }>;
    }>;

    mockFindMany.mockResolvedValue(
      trips as unknown as Awaited<ReturnType<typeof prisma.featuredTrip.findMany>>
    );

    const req = new NextRequest(
      "http://localhost/api/featured-trips/public?slot=ZONE&withPrices=1"
    );
    const res = (await handler.GET(req)) as Response;
    expect(res.ok).toBe(true);
    const json = await res.json();

    expect(json.trips[0].slug).toBe("cremieu");
    expect(json.trips[0].poiDestinations).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Aéroport", priceCents: 4200 })])
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          slug: true,
          poiDestinations: expect.any(Object),
        }),
      })
    );
  });
});
