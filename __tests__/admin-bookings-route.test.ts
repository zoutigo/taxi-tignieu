/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildBookingEmail, sendMail } from "@/lib/mailer";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: typeof import("@/lib/prisma").prisma) => unknown) =>
      cb(
        (globalThis as Record<string, unknown>)
          .__ADMIN_PRISMA_MOCK__ as typeof import("@/lib/prisma").prisma
      )
    ),
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    bookingNote: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn().mockResolvedValue({
    name: "Taxi Tignieu",
    ownerName: "Admin",
    siret: "",
    ape: "",
    phone: "0600000000",
    email: "contact@test.fr",
    address: {
      street: "rue",
      streetNumber: "1",
      postalCode: "00000",
      city: "Ville",
      country: "France",
    },
  }),
}));
jest.mock("@/lib/mailer", () => ({
  buildBookingEmail: jest.fn((opts: { to: string }) => ({
    to: opts.to,
    subject: "Test",
    html: "<p>test</p>",
    text: "test",
  })),
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedFindMany = prisma.booking.findMany as jest.MockedFunction<
  typeof prisma.booking.findMany
>;
const mockedFindUnique = prisma.booking.findUnique as jest.MockedFunction<
  typeof prisma.booking.findUnique
>;
const mockedUpdate = prisma.booking.update as jest.MockedFunction<typeof prisma.booking.update>;
const mockedFindUser = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
const mockedBuildBookingEmail = buildBookingEmail as jest.MockedFunction<typeof buildBookingEmail>;
const mockedSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
(prisma as unknown as { $transaction: typeof prisma.$transaction }).$transaction = (
  cb: (tx: typeof prisma) => unknown
) => cb(prisma as typeof prisma);
(prisma as unknown as { bookingNote: typeof prisma.bookingNote }).bookingNote = (
  prisma as unknown as { bookingNote?: typeof prisma.bookingNote }
).bookingNote || {
  create: jest.fn(),
};
(globalThis as Record<string, unknown>).__ADMIN_PRISMA_MOCK__ = prisma;

describe("api/admin/bookings", () => {
  beforeEach(() => jest.clearAllMocks());
  const bookingStub = {
    id: 1,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "u1",
    dateTime: new Date(),
    pax: 1,
    luggage: 0,
    babySeat: false,
    priceCents: null,
    pickupId: 1,
    dropoffId: 2,
    pickup: {
      street: "rue",
      streetNumber: "1",
      postalCode: "00000",
      city: "Ville",
      country: "France",
      name: null,
    },
    dropoff: {
      street: "rue",
      streetNumber: "1",
      postalCode: "00000",
      city: "Ville",
      country: "France",
      name: null,
    },
    user: { name: "User", email: "user@test.fr", phone: "0600000000" },
    customer: { fullName: "Client", phone: "0600000000", email: "client@test.fr" },
    driver: { id: "d1", name: "Driver", email: "driver@test.fr", phone: "0600000000" },
    bookingNotes: [],
  };

  it("bloque l'accès non admin", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: false, isManager: false } });
    const mod = await import("@/app/api/admin/bookings/route");
    const res = await mod.GET();
    expect(res.status).toBe(403);
  });

  it("liste pour admin", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindMany.mockResolvedValue([]);
    const mod = await import("@/app/api/admin/bookings/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("update une réservation", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, driverId: null });
    mockedUpdate.mockResolvedValue({ ...bookingStub });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, status: "CONFIRMED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("supprime une réservation", async () => {
    mockedAuth.mockResolvedValue({ user: { isManager: true } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, status: "PENDING", invoice: null });
    mockedUpdate.mockResolvedValue({ ...bookingStub, status: "CANCELLED" });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "DELETE",
      body: JSON.stringify({ id: 1, note: "annulation" }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("refuse de supprimer une réservation terminée ou facturée", async () => {
    mockedAuth.mockResolvedValue({ user: { isManager: true } });
    mockedFindUnique.mockResolvedValue({
      ...bookingStub,
      status: "COMPLETED",
      invoice: { id: "inv1" },
    });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "DELETE",
      body: JSON.stringify({ id: "b1", note: "annulation" }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(409);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("refuse de supprimer une réservation déjà annulée", async () => {
    mockedAuth.mockResolvedValue({ user: { isManager: true } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, status: "CANCELLED", invoice: null });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "DELETE",
      body: JSON.stringify({ id: "b1", note: "annulation" }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(409);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("refuse de modifier une réservation déjà annulée", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, status: "CANCELLED" });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, status: "CONFIRMED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(409);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("confirme avec chauffeur et note, envoie des mails et ajoute une note", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "admin" } });
    mockedFindUnique.mockResolvedValue({
      ...bookingStub,
      status: "PENDING",
      driver: { id: "d1", name: "Driver", email: "driver@test.fr", phone: "0600" },
      user: { name: "User", email: "user@test.fr", phone: "0600" },
    });
    mockedUpdate.mockResolvedValue({
      ...bookingStub,
      status: "CONFIRMED",
      driverId: "d1",
      bookingNotes: [],
    });

    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({
        id: bookingStub.id,
        status: "CONFIRMED",
        driverId: "d1",
        notes: "note confirm",
      }),
    });
    const res = await mod.PATCH(req);

    expect(res.status).toBe(200);
    expect(prisma.bookingNote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: "note confirm", bookingId: bookingStub.id }),
    });
    expect(mockedBuildBookingEmail).toHaveBeenCalled();
    expect(mockedSendMail).toHaveBeenCalled();
  });

  it("refuse de modifier une réservation terminée ou facturée", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindUnique.mockResolvedValue({
      ...bookingStub,
      status: "COMPLETED",
      invoice: { id: "inv1" },
    });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, status: "CONFIRMED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(409);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("autorise un driver à consulter les réservations", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true } });
    mockedFindMany.mockResolvedValue([]);
    const mod = await import("@/app/api/admin/bookings/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("requiert une note pour terminer", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, status: "CONFIRMED", invoice: null });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, status: "COMPLETED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(400);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("termine avec note, crée un bookingNote et envoie un mail", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "admin" } });
    mockedFindUnique.mockResolvedValue({
      ...bookingStub,
      status: "CONFIRMED",
      invoice: null,
      driver: { id: "d1", name: "Driver", email: "driver@test.fr", phone: "0600" },
      user: { name: "User", email: "user@test.fr", phone: "0600" },
    });
    mockedUpdate.mockResolvedValue({ ...bookingStub, status: "COMPLETED", bookingNotes: [] });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({
        id: 1,
        status: "COMPLETED",
        completionNotes: "cloture",
        generateInvoice: true,
      }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(prisma.bookingNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ content: "cloture" }) })
    );
    expect(mockedSendMail).toHaveBeenCalled();
  });

  it("envoie les mails client/admin lors d'une modification (PATCH sans changement de statut)", async () => {
    const prevAdmin = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "admin@test.fr";
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "admin", email: "admin@test.fr" } });
    mockedFindUnique.mockResolvedValue({
      ...bookingStub,
      status: "PENDING",
      user: { email: "client@test.fr", name: "Client", phone: "0600" },
      bookingNotes: [],
    });
    mockedUpdate.mockResolvedValue({ ...bookingStub });
    (prisma as unknown as { bookingNote: typeof prisma.bookingNote }).bookingNote.create = jest
      .fn()
      .mockResolvedValue({});
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: bookingStub.id, passengers: 3 }),
    });
    const res = await mod.PATCH(req);
    await Promise.resolve();
    expect(res.status).toBe(200);
    expect(mockedSendMail).toHaveBeenCalled();
    const recipients = mockedSendMail.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain("client@test.fr");
    expect(recipients).toContain("admin@test.fr");
    process.env.ADMIN_EMAILS = prevAdmin;
  });

  it("permet à un driver de prendre une course (driverId + status)", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true, id: "d1" } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, driverId: null });
    mockedFindUser.mockResolvedValue({ ...bookingStub.driver, isDriver: true, id: "d1" });
    mockedUpdate.mockResolvedValue({ ...bookingStub, driverId: "d1" });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: "1", driverId: "d1", status: "CONFIRMED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "1" } }));
  });

  it("refuse qu'un driver modifie des champs interdits", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true, id: "d1" } });
    mockedFindUnique.mockResolvedValue({ ...bookingStub, driverId: "d1" });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, pickup: "New pickup" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
