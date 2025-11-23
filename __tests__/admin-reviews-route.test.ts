import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock;
const mockedFindMany = prisma.review.findMany as unknown as jest.Mock;
const mockedUpdate = prisma.review.update as unknown as jest.Mock;
const mockedDelete = prisma.review.delete as unknown as jest.Mock;

describe("api/admin/reviews", () => {
  beforeEach(() => jest.clearAllMocks());

  it("interdit non admin/manager", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: false, isManager: false } });
    const mod = await import("@/app/api/admin/reviews/route");
    const res = await mod.GET();
    expect(res.status).toBe(403);
  });

  it("liste quand admin", async () => {
    mockedAuth.mockResolvedValue({ user: { isManager: true } });
    mockedFindMany.mockResolvedValue([]);
    const mod = await import("@/app/api/admin/reviews/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("update un avis", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedUpdate.mockResolvedValue({ id: 1 });
    const mod = await import("@/app/api/admin/reviews/route");
    const req = new Request("http://localhost/api/admin/reviews", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, status: "APPROVED" }),
    });
    const res = await mod.PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("supprime un avis", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedDelete.mockResolvedValue({ ok: true });
    const mod = await import("@/app/api/admin/reviews/route");
    const req = new Request("http://localhost/api/admin/reviews", {
      method: "DELETE",
      body: JSON.stringify({ id: 1 }),
    });
    const res = await mod.DELETE(req);
    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalled();
  });
});
