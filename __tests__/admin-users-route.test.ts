import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb((globalThis as Record<string, unknown>).__PRISMA_USERS_TX__)
    ),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      updateMany: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock;
const mockedFindMany = prisma.user.findMany as unknown as jest.Mock;
const mockedFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockedUpdate = prisma.user.update as unknown as jest.Mock;
const mockedBookingUpdateMany = prisma.booking.updateMany as unknown as jest.Mock;

(globalThis as Record<string, unknown>).__PRISMA_USERS_TX__ = {
  booking: { updateMany: mockedBookingUpdateMany },
  user: { update: mockedUpdate },
};

describe("api/admin/users", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refuse l'accès si non admin/manager", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: false, isManager: false } });
    const mod = await import("@/app/api/admin/users/route");
    const res = await mod.GET();
    expect(res.status).toBe(403);
  });

  it("liste les users si admin", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedFindMany.mockResolvedValue([]);
    const mod = await import("@/app/api/admin/users/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("met à jour les rôles", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedUpdate.mockResolvedValue({ id: "u1" });
    const mod = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ id: "u1", isAdmin: true }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("désactive un utilisateur et retire ses affectations chauffeur en cours", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "admin-1" } });
    mockedFindUnique.mockResolvedValue({ id: "u1" });
    mockedUpdate.mockResolvedValue({ id: "u1", isActive: false });
    mockedBookingUpdateMany.mockResolvedValue({ count: 0 });

    const mod = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "DELETE",
      body: JSON.stringify({ id: "u1" }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(200);
    expect(mockedBookingUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { isActive: false } });
  });

  it("refuse l'auto-suppression", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "u1" } });
    const mod = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "DELETE",
      body: JSON.stringify({ id: "u1" }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(409);
  });

  it("refuse l'auto-désactivation via PATCH", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true, id: "u1" } });
    const mod = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ id: "u1", isActive: false }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(409);
  });
});
