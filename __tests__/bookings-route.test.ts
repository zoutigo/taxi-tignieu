/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { POST } from "@/app/api/bookings/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildBookingEmail, sendMail } from "@/lib/mailer";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: typeof import("@/lib/prisma").prisma) => unknown) =>
      cb(
        (globalThis as Record<string, unknown>)
          .__PRISMA_MOCK__ as typeof import("@/lib/prisma").prisma
      )
    ),
    address: {
      create: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bookingNote: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/mailer", () => ({
  buildBookingEmail: jest.fn(() => ({
    to: "user@test.fr",
    subject: "Email test",
    html: "<p>t</p>",
    text: "t",
  })),
  sendMail: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn().mockResolvedValue({
    phone: "04 95 78 54 00",
    email: "contact@taxitignieucharvieur.fr",
    address: {
      street: "Rue",
      streetNumber: "9",
      postalCode: "38230",
      city: "Tignieu",
      country: "France",
    },
  }),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedAddressCreate = prisma.address.create as jest.MockedFunction<
  typeof prisma.address.create
>;
const mockedCreate = prisma.booking.create as jest.MockedFunction<typeof prisma.booking.create>;
const mockedFindMany = prisma.booking.findMany as jest.MockedFunction<
  typeof prisma.booking.findMany
>;
const mockedFindUnique = prisma.booking.findUnique as jest.MockedFunction<
  typeof prisma.booking.findUnique
>;
const mockedUpdate = prisma.booking.update as jest.MockedFunction<typeof prisma.booking.update>;
const mockedDelete = prisma.booking.delete as jest.MockedFunction<typeof prisma.booking.delete>;
const mockedBookingNoteCreate = prisma.bookingNote.create as jest.MockedFunction<
  typeof prisma.bookingNote.create
>;
const mockedBuildBookingEmail = buildBookingEmail as jest.MockedFunction<typeof buildBookingEmail>;
const mockedSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
const mockedGetSiteContact = jest.requireMock("@/lib/site-config").getSiteContact as jest.Mock;
(prisma as unknown as { $transaction: typeof prisma.$transaction }).$transaction = (
  cb: (tx: typeof prisma) => unknown
) => cb(prisma as typeof prisma);
(prisma as unknown as { bookingNote: typeof prisma.bookingNote }).bookingNote = (
  prisma as unknown as { bookingNote?: typeof prisma.bookingNote }
).bookingNote || {
  create: jest.fn(),
};
(globalThis as Record<string, unknown>).__PRISMA_MOCK__ = prisma;

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBuildBookingEmail.mockReturnValue({
      to: "user@test.fr",
      subject: "Email test",
      html: "<p>test</p>",
      text: "test",
    });
    mockedGetSiteContact.mockClear();
  });

  it("refuse sans session", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("crée une réservation avec user connecté", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "u1", email: "user@test.fr", name: "User" },
    } as { user: { id: string; email: string; name: string } });
    mockedAddressCreate.mockResolvedValue({ id: "a10" });
    mockedAddressCreate.mockResolvedValueOnce({ id: "a10" });
    mockedAddressCreate.mockResolvedValueOnce({ id: "a11" });
    mockedBookingNoteCreate.mockResolvedValue({ id: 99 });
    mockedCreate.mockResolvedValue({
      id: "b1",
      createdAt: new Date(),
      userId: "u1",
      dateTime: new Date(),
      pax: 2,
      luggage: 1,
      babySeat: false,
      priceCents: 4200,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      pickupId: "a10",
      dropoffId: "a11",
    });

    const payload = {
      pickup: { label: "114 B route", lat: 45, lng: 5 },
      dropoff: { label: "Aéroport", lat: 46, lng: 5.1 },
      date: "2025-11-24",
      time: "12:50",
      passengers: 2,
      luggage: 1,
      notes: "Test",
      estimatedPrice: 42,
      policiesAccepted: true,
    };

    const res = await POST(makeRequest(payload));

    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pickupId: "a10",
          dropoffId: "a11",
          pax: payload.passengers,
          luggage: payload.luggage,
          priceCents: 4200,
          userId: "u1",
        }),
      })
    );
    expect(mockedBookingNoteCreate).toHaveBeenCalledWith({
      data: {
        content: payload.notes,
        bookingId: "b1",
        authorId: "u1",
      },
    });
    expect(mockedBuildBookingEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendMail).toHaveBeenCalledTimes(1);
  });

  it("calcule dateTime et priceCents, même sans notes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as { user: { id: string } });
    mockedAddressCreate.mockResolvedValueOnce({ id: "a10" });
    mockedAddressCreate.mockResolvedValueOnce({ id: "a11" });
    mockedCreate.mockResolvedValue({
      id: "b2",
      createdAt: new Date(),
      userId: "u1",
      dateTime: new Date("2025-01-01T10:30:00Z"),
      pax: 1,
      luggage: 0,
      babySeat: false,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      bookingNotes: [],
    });

    const res = await POST(
      makeRequest({
        pickup: { label: "123 Rue Test", lat: 45, lng: 5 },
        dropoff: { label: "Destination", lat: 46, lng: 5.1 },
        date: "2025-01-01",
        time: "10:30",
        passengers: 1,
        luggage: 0,
        notes: "",
        estimatedPrice: null,
        policiesAccepted: true,
      })
    );

    expect(res.status).toBe(201);
    const called = mockedCreate.mock.calls[0]?.[0] as {
      data?: { dateTime?: unknown; priceCents?: unknown; pickupId?: string; dropoffId?: string };
    };
    expect(called?.data?.dateTime).toBeInstanceOf(Date);
    expect(called?.data?.priceCents).toBeNull();
    expect(called?.data?.pickupId).toBe("a10");
    expect(called?.data?.dropoffId).toBe("a11");
  });
});

describe("GET /api/bookings", () => {
  it("renvoie les réservations de l'utilisateur", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } } as { user: { id: string } });
    mockedFindMany.mockResolvedValue([
      {
        id: "b1",
        createdAt: new Date(),
        userId: "u1",
        pickupId: "a1",
        dropoffId: "a2",
        pickup: { id: "a1" },
        dropoff: { id: "a2" },
        dateTime: new Date(),
        pax: 1,
        luggage: 0,
        babySeat: false,
        priceCents: null,
        status: "PENDING",
        updatedAt: new Date(),
        customerId: null,
        bookingNotes: [],
      },
    ]);

    const res = await (await import("@/app/api/bookings/route")).GET();

    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
      include: { pickup: true, dropoff: true, bookingNotes: { orderBy: { createdAt: "asc" } } },
    });
  });
});

describe("PATCH /api/bookings", () => {
  it("interdit si pas propriétaire", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u2" } } as { user: { id: string } });
    mockedFindUnique.mockResolvedValue({
      id: "b1",
      createdAt: new Date(),
      userId: "other",
      pickupId: "a1",
      dropoffId: "a2",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      bookingNotes: [],
    });

    const res = await (
      await import("@/app/api/bookings/route")
    ).PATCH(makeRequest({ id: "b1", pickup: { label: "New", lat: 1, lng: 1 } }));

    expect(res.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("autorise propriétaire", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1", email: "a@test.com" } } as {
      user: { id: string; email: string };
    });
    mockedBookingNoteCreate.mockResolvedValue({ id: 2 });
    mockedFindUnique.mockResolvedValue({
      id: "b1",
      createdAt: new Date(),
      userId: "u1",
      pickupId: "a1",
      dropoffId: "a2",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      bookingNotes: [],
    });
    mockedUpdate.mockResolvedValue({
      id: "b1",
      createdAt: new Date(),
      userId: "u1",
      pickup: "New",
      dropoff: "Dest",
      dateTime: new Date(),
      pax: 2,
      luggage: 1,
      babySeat: false,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      bookingNotes: [],
    });

    const res = await (
      await import("@/app/api/bookings/route")
    ).PATCH(
      makeRequest({
        id: "b1",
        pickup: { label: "New", lat: 1, lng: 1 },
        dropoff: { label: "Dest", lat: 2, lng: 2 },
        date: "2025-01-01",
        time: "10:00",
        passengers: 2,
        luggage: 1,
        notes: "Note",
        estimatedPrice: 55.5,
      })
    );

    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pickupId: expect.any(String),
          priceCents: 5550,
        }),
      })
    );
    expect(mockedBookingNoteCreate).toHaveBeenCalledWith({
      data: {
        content: "Note",
        bookingId: "b1",
        authorId: "u1",
      },
    });
  });

  it("envoie un mail de modification au user et au site avec les changements", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "u1", email: "user@test.fr", name: "User", phone: "0601010101" },
    } as { user: { id: string; email: string; name: string; phone: string } });

    const oldDate = new Date("2025-01-01T10:00:00Z");
    const newDate = new Date("2025-01-02T11:00:00Z");
    mockedFindUnique.mockResolvedValue({
      id: "b1",
      createdAt: oldDate,
      userId: "u1",
      pickup: { name: "Ancien dep", street: "Rue A", postalCode: "11111", city: "Old" },
      dropoff: { name: "Ancienne arr", street: "Rue B", postalCode: "22222", city: "OldCity" },
      dateTime: oldDate,
      pax: 1,
      luggage: 0,
      babySeat: false,
      notes: "Old",
      priceCents: 1000,
      status: "PENDING",
      updatedAt: oldDate,
      customerId: null,
    });
    mockedUpdate.mockResolvedValue({
      id: "b1",
      createdAt: newDate,
      userId: "u1",
      pickup: { name: "Nouveau dep", street: "Rue C", postalCode: "33333", city: "New" },
      dropoff: { name: "Nouvelle arr", street: "Rue D", postalCode: "44444", city: "NewCity" },
      dateTime: newDate,
      pax: 2,
      luggage: 1,
      babySeat: false,
      notes: "New",
      priceCents: 2000,
      status: "PENDING",
      updatedAt: newDate,
      customerId: null,
    });

    await (
      await import("@/app/api/bookings/route")
    ).PATCH(
      makeRequest({
        id: "b1",
        pickup: { label: "Nouveau dep", lat: 1, lng: 1 },
        dropoff: { label: "Nouvelle arr", lat: 2, lng: 2 },
        date: "2025-01-02",
        time: "11:00",
        passengers: 2,
        luggage: 1,
        notes: "New",
        estimatedPrice: 20,
      })
    );

    expect(mockedBuildBookingEmail).toHaveBeenCalled();
    expect(mockedSendMail).toHaveBeenCalledTimes(2);
  });
});

describe("DELETE /api/bookings", () => {
  it("autorise admin via ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    mockedAuth.mockResolvedValue({ user: { id: "uX", email: "admin@test.com" } } as {
      user: { id: string; email: string };
    });
    mockedFindUnique.mockResolvedValue({
      id: "bDel",
      createdAt: new Date(),
      userId: "other",
      pickupId: "a1",
      dropoffId: "a2",
      dateTime: new Date(),
      pax: 1,
      luggage: 0,
      babySeat: false,
      priceCents: null,
      status: "PENDING",
      updatedAt: new Date(),
      customerId: null,
      bookingNotes: [],
    });
    mockedDelete.mockResolvedValue({ ok: true });

    const res = await (
      await import("@/app/api/bookings/route")
    ).DELETE(makeRequest({ id: "bDel" }));

    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: "bDel" } });
  });
});
