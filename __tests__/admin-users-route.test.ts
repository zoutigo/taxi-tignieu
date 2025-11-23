import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock;
const mockedFindMany = prisma.user.findMany as unknown as jest.Mock;
const mockedUpdate = prisma.user.update as unknown as jest.Mock;

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
});
