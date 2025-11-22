import { POST } from "@/app/api/bookings/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock<Promise<unknown>, unknown[]>;
const mockedCreate = prisma.booking.create as unknown as jest.Mock<Promise<unknown>, unknown[]>;
const mockedFindMany = prisma.booking.findMany as unknown as jest.Mock<Promise<unknown>, unknown[]>;
const mockedFindUnique = prisma.booking.findUnique as unknown as jest.Mock<
  Promise<unknown>,
  unknown[]
>;
const mockedUpdate = prisma.booking.update as unknown as jest.Mock<Promise<unknown>, unknown[]>;
const mockedDelete = prisma.booking.delete as unknown as jest.Mock<Promise<unknown>, unknown[]>;

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse sans session", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("crée une réservation avec user connecté", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as { user: { id: string } });
    mockedCreate.mockResolvedValue({
      id: 1,
      createdAt: new Date(),
      userId: "u1",
      pickup: "114 B route",
      dropoff: "Aéroport",
      dateTime: new Date(),
      pax: 2,
      luggage: 1,
      babySeat: false,
      notes: "Test",
      priceCents: 4200,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });

    const payload = {
      pickup: "114 B route",
      dropoff: "Aéroport",
      date: "2025-11-24",
      time: "12:50",
      passengers: 2,
      luggage: 1,
      notes: "Test",
      estimatedPrice: 42,
    };

    const res = await POST(makeRequest(payload));

    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pickup: payload.pickup,
          dropoff: payload.dropoff,
          pax: payload.passengers,
          luggage: payload.luggage,
          notes: payload.notes,
          priceCents: 4200,
          userId: "u1",
        }),
      })
    );
  });

  it("calcule dateTime et priceCents, même sans notes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as { user: { id: string } });
    mockedCreate.mockResolvedValue({
      id: 2,
      createdAt: new Date(),
      userId: "u1",
      pickup: "X",
      dropoff: "Y",
      dateTime: new Date("2025-01-01T10:30:00Z"),
      pax: 1,
      luggage: 0,
      babySeat: false,
      notes: "",
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });

    const res = await POST(
      makeRequest({
        pickup: "123 Rue Test",
        dropoff: "Destination",
        date: "2025-01-01",
        time: "10:30",
        passengers: 1,
        luggage: 0,
        notes: "",
        estimatedPrice: null,
      })
    );

    expect(res.status).toBe(201);
    const called = mockedCreate.mock.calls[0]?.[0] as {
      data?: { dateTime?: unknown; priceCents?: unknown };
    };
    expect(called?.data?.dateTime).toBeInstanceOf(Date);
    expect(called?.data?.priceCents).toBeNull();
  });
});

describe("GET /api/bookings", () => {
  it("renvoie les réservations de l'utilisateur", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as { user: { id: string } });
    mockedFindMany.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date(),
        userId: "u1",
        pickup: "X",
        dropoff: "Y",
        dateTime: new Date(),
        pax: 1,
        luggage: 0,
        babySeat: false,
        notes: null,
        priceCents: null,
        status: "PENDING",
        updatedAt: new Date(),
        customerId: null,
      },
    ]);

    const res = await (await import("@/app/api/bookings/route")).GET();

    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("PATCH /api/bookings", () => {
  it("interdit si pas propriétaire", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u2" } } as { user: { id: string } });
    mockedFindUnique.mockResolvedValue({
      id: 1,
      createdAt: new Date(),
      userId: "other",
      pickup: "X",
      dropoff: "Y",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      notes: null,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });

    const res = await (
      await import("@/app/api/bookings/route")
    ).PATCH(makeRequest({ id: 1, pickup: "New" }));

    expect(res.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("autorise propriétaire", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1", email: "a@test.com" } } as {
      user: { id: string; email: string };
    });
    mockedFindUnique.mockResolvedValue({
      id: 1,
      createdAt: new Date(),
      userId: "u1",
      pickup: "X",
      dropoff: "Y",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      notes: null,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });
    mockedUpdate.mockResolvedValue({
      id: 1,
      createdAt: new Date(),
      userId: "u1",
      pickup: "New",
      dropoff: "Dest",
      dateTime: new Date(),
      pax: 2,
      luggage: 1,
      babySeat: false,
      notes: "Note",
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });

    const res = await (
      await import("@/app/api/bookings/route")
    ).PATCH(
      makeRequest({
        id: 1,
        pickup: "New",
        dropoff: "Dest",
        date: "2025-01-01",
        time: "10:00",
        passengers: 2,
        luggage: 1,
        notes: "Note",
      })
    );

    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });
});

describe("DELETE /api/bookings", () => {
  it("autorise admin via ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    mockedAuth.mockResolvedValue({ user: { id: "uX", email: "admin@test.com" } } as {
      user: { id: string; email: string };
    });
    mockedFindUnique.mockResolvedValue({
      id: 1,
      createdAt: new Date(),
      userId: "other",
      pickup: "X",
      dropoff: "Y",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      notes: null,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
    });
    mockedDelete.mockResolvedValue({ ok: true });

    const res = await (await import("@/app/api/bookings/route")).DELETE(makeRequest({ id: 1 }));

    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
