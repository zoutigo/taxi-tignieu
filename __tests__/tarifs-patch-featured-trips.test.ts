/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/settings/tarifs/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(async () => ({ user: { isAdmin: true } })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    tariffConfig: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    featuredTrip: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    featuredPoi: {
      update: jest.fn(),
    },
    address: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.featuredTrip.findMany as jest.MockedFunction<
  typeof prisma.featuredTrip.findMany
>;
const mockTripUpdate = prisma.featuredTrip.update as jest.MockedFunction<
  typeof prisma.featuredTrip.update
>;
const mockPoiUpdate = prisma.featuredPoi.update as jest.MockedFunction<
  typeof prisma.featuredPoi.update
>;
const mockAddrCreate = prisma.address.create as jest.MockedFunction<typeof prisma.address.create>;
const mockAddrUpdate = prisma.address.update as jest.MockedFunction<typeof prisma.address.update>;
const mockTariffUpsert = prisma.tariffConfig.upsert as jest.MockedFunction<
  typeof prisma.tariffConfig.upsert
>;

describe("PATCH /api/settings/tarifs - recalcul des featured trips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("géocode pickup/POI et met à jour distances, durées et prix", async () => {
    // données en base
    const trips = [
      {
        id: "trip1",
        slug: "cremieu",
        title: "Crémieu",
        summary: null,
        featuredSlot: "ZONE",
        pickupLabel: "Crémieu",
        pickupAddressId: null,
        dropoffLabel: null,
        dropoffAddressId: null,
        distanceKm: null,
        durationMinutes: null,
        basePriceCents: null,
        priority: 1,
        active: true,
        badge: null,
        zoneLabel: null,
        poiDestinations: [
          {
            id: "poi1",
            label: "Aéroport",
            dropoffAddressId: null,
            dropoffAddress: null,
            distanceKm: null,
            durationMinutes: null,
            priceCents: null,
            order: 0,
          },
        ],
      },
    ];
    mockFindMany.mockResolvedValue(trips as any);

    // geocode puis quote : on renvoie des valeurs déterministes
    const fetchMock = jest
      .fn()
      // geocode pickup
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ lat: 45.7, lng: 4.9 }] }), { status: 200 })
      )
      // geocode poi
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ lat: 45.8, lng: 4.5 }] }), { status: 200 })
      )
      // quote
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ distanceKm: 12.34, durationMinutes: 20, price: 56.78 }), {
          status: 200,
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    mockAddrCreate.mockResolvedValue({ id: "addr1" } as Awaited<
      ReturnType<typeof prisma.address.create>
    >);
    mockTariffUpsert.mockResolvedValue({ id: "tariff" } as Awaited<
      ReturnType<typeof prisma.tariffConfig.upsert>
    >);

    const req = new NextRequest("http://localhost/api/settings/tarifs", {
      method: "PATCH",
      body: JSON.stringify({
        baseCharge: 3,
        kmA: 1,
        kmB: 2,
        kmC: 3,
        kmD: 4,
        waitPerHour: 10,
        baggageFee: 1,
        fifthPassenger: 2,
      }),
    }) as unknown as NextRequest;

    const res = (await PATCH(req)) as Response;
    expect(res.status).toBe(200);

    // 2 appels geocode (pickup + poi) – plus de fetch pour le quote (calcul local)
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Adresse pickup créée et mise à jour des coords
    expect(mockAddrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Crémieu" }) })
    );
    expect(mockAddrUpdate).toHaveBeenCalledTimes(0); // rien à update car on vient de créer

    // POI mis à jour
    expect(mockPoiUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "poi1" },
        data: expect.objectContaining({
          dropoffAddressId: "addr1",
          distanceKm: expect.any(Number),
          durationMinutes: expect.any(Number),
          priceCents: expect.any(Number),
        }),
      })
    );

    // Trip mis à jour avec pickupAddressId
    expect(mockTripUpdate).toHaveBeenCalledWith({
      where: { id: "trip1" },
      data: expect.objectContaining({ pickupAddressId: "addr1" }),
    });
  });
});
