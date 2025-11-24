import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock;
const mockedUpdate = prisma.user.update as unknown as jest.Mock;

describe("/api/profile/avatar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refuse sans session", async () => {
    mockedAuth.mockResolvedValue(null);
    const mod = await import("@/app/api/profile/avatar/route");
    const req = new Request("http://localhost/api/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-1" }),
    });
    const res = await mod.POST(req);
    expect(res.status).toBe(401);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("valide l'avatar et met à jour", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } });
    mockedUpdate.mockResolvedValue({
      id: "u1",
      image: "https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-1",
    });
    const mod = await import("@/app/api/profile/avatar/route");
    const req = new Request("http://localhost/api/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-1" }),
    });
    const res = await mod.POST(req);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { image: "https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-1" },
      select: { id: true, image: true },
    });
  });

  it("rejette un avatar invalide", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } });
    const mod = await import("@/app/api/profile/avatar/route");
    const req = new Request("http://localhost/api/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatar: "https://invalid.test/avatar.png" }),
    });
    const res = await mod.POST(req);
    expect(res.status).toBe(400);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
