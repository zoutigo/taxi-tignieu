/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    featuredTrip: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    featuredPoi: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  },
}));

const mockedAuth = auth as unknown as jest.Mock;
const trip = prisma.featuredTrip as any;
const poi = prisma.featuredPoi as any;
const tx = prisma.$transaction as unknown as jest.Mock;

const basePayload = {
  slug: "tignieu-aeroport",
  title: "Tignieu → Aéroport",
  summary: "Navette aéroport",
  featuredSlot: "TYPE",
  pickupLabel: "Tignieu",
  pickupAddressId: "11111111-1111-4111-8111-111111111111",
  priority: 1,
  active: true,
  poiDestinations: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      label: "Aéroport Lyon",
      dropoffAddressId: "33333333-3333-4333-8333-333333333333",
      distanceKm: 25,
      durationMinutes: 30,
      priceCents: 4500,
      order: 0,
    },
  ],
};

describe("api/admin/featured-trips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
  });

  it("refuse l'accès si non admin/manager", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: false, isManager: false } });
    const mod = await import("@/app/api/admin/featured-trips/route");
    const res = await mod.GET();
    expect(res.status).toBe(403);
  });

  it("GET retourne les trajets", async () => {
    trip.findMany.mockResolvedValue([{ id: "t1" }]);
    const mod = await import("@/app/api/admin/featured-trips/route");
    const res = await mod.GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.trips).toEqual([{ id: "t1" }]);
    expect(trip.findMany).toHaveBeenCalled();
  });

  it("POST valide les données et renvoie 400 avec message zod", async () => {
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, pickupLabel: "" }), // invalide
    });
    const res = await mod.POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("POST refuse les doublons de slug", async () => {
    trip.findFirst.mockResolvedValue({ id: "existing" });
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await mod.POST(req);
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error).toMatch(/slug/i);
  });

  it("POST crée un trajet avec ses POI", async () => {
    trip.findFirst.mockResolvedValue(null);
    trip.create.mockResolvedValue({ id: "new", ...basePayload });
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await mod.POST(req);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.trip.id).toBe("new");
    expect(trip.create).toHaveBeenCalled();
  });

  it("PATCH valide le schéma et renvoie 400 si id manquant", async () => {
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "PATCH",
      body: JSON.stringify({ ...basePayload }), // pas d'id
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(400);
  });

  it("PATCH refuse un slug déjà pris", async () => {
    trip.findFirst.mockResolvedValue({ id: "other" });
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "PATCH",
      body: JSON.stringify({ ...basePayload, id: "44444444-4444-4444-8444-444444444444" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(409);
  });

  it("PATCH met à jour et remplace les POI", async () => {
    trip.findFirst.mockResolvedValue(null);
    trip.findUnique.mockResolvedValue({ id: "abc" });
    poi.deleteMany.mockResolvedValue({});
    poi.createMany.mockResolvedValue({});
    trip.update.mockResolvedValue({ id: "abc" });
    tx.mockImplementation(async (cb) => cb(prisma));

    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "PATCH",
      body: JSON.stringify({ ...basePayload, id: "44444444-4444-4444-8444-444444444444" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(poi.deleteMany).toHaveBeenCalledWith({
      where: { tripId: "44444444-4444-4444-8444-444444444444" },
    });
    expect(poi.createMany).toHaveBeenCalled();
  });

  it("DELETE exige un id", async () => {
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    const res = await mod.DELETE(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/id requis/i);
  });

  it("DELETE gère l'erreur FK (P2003) avec message pour AppMessage", async () => {
    poi.deleteMany.mockResolvedValue({});
    trip.delete.mockRejectedValue({ code: "P2003" });
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "DELETE",
      body: JSON.stringify({ id: "abc" }),
    });
    const res = await mod.DELETE(req);
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error).toMatch(/Suppression impossible/i);
  });

  it("DELETE supprime le trajet et renvoie ok", async () => {
    poi.deleteMany.mockResolvedValue({});
    trip.delete.mockResolvedValue({});
    const mod = await import("@/app/api/admin/featured-trips/route");
    const req = new Request("http://localhost/api/admin/featured-trips", {
      method: "DELETE",
      body: JSON.stringify({ id: "abc" }),
    });
    const res = await mod.DELETE(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
