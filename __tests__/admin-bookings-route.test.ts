/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedFindMany = prisma.booking.findMany as jest.MockedFunction<
  typeof prisma.booking.findMany
>;
const mockedFindUnique = prisma.booking.findUnique as jest.MockedFunction<
  typeof prisma.booking.findUnique
>;
const mockedUpdate = prisma.booking.update as jest.MockedFunction<typeof prisma.booking.update>;
const mockedDelete = prisma.booking.delete as jest.MockedFunction<typeof prisma.booking.delete>;
const mockedFindUser = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
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
    mockedFindUnique.mockResolvedValue({ driverId: null });
    mockedUpdate.mockResolvedValue({ id: 1 });
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
    mockedDelete.mockResolvedValue({ ok: true });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "DELETE",
      body: JSON.stringify({ id: 1 }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalled();
  });

  it("autorise un driver à consulter les réservations", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true } });
    mockedFindMany.mockResolvedValue([]);
    const mod = await import("@/app/api/admin/bookings/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("permet à un driver de prendre une course (driverId + status)", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true, id: "d1" } });
    mockedFindUnique.mockResolvedValue({ driverId: null });
    mockedFindUser.mockResolvedValue({ isDriver: true });
    mockedUpdate.mockResolvedValue({ id: 1 });
    const mod = await import("@/app/api/admin/bookings/route");
    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, driverId: "d1", status: "CONFIRMED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });

  it("refuse qu'un driver modifie des champs interdits", async () => {
    mockedAuth.mockResolvedValue({ user: { isDriver: true, id: "d1" } });
    mockedFindUnique.mockResolvedValue({ driverId: "d1" });
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
