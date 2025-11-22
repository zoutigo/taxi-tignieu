import { POST } from "@/app/api/profile/phone/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedUpdate = prisma.user.update as jest.MockedFunction<typeof prisma.user.update>;

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/profile/phone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/profile/phone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renvoie 401 sans session", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await POST(makeRequest({ phone: "+33 4 95 78 54 00" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Non autorisé." });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("renvoie 400 si le format est invalide", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as any);

    const res = await POST(makeRequest({ phone: "abc" }));

    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toBeTruthy();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("met à jour le numéro avec succès", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
    mockedUpdate.mockResolvedValue({ id: "user-1" } as any);

    const res = await POST(makeRequest({ phone: "+33 4 95 78 54 00" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { phone: "+33 4 95 78 54 00" },
    });
  });
});
