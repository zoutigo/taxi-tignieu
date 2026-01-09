import { POST } from "@/app/api/profile/phone/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { User } from "@prisma/client";

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

const mockedAuth = auth as unknown as jest.MockedFunction<() => Promise<Session | null>>;
const mockedUpdate = prisma.user.update as unknown as jest.MockedFunction<() => Promise<User>>;

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
    mockedAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" } as Session);

    const res = await POST(makeRequest({ phone: "abc" }));

    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toBeTruthy();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("met à jour le numéro avec succès", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" } as Session);
    mockedUpdate.mockResolvedValue({
      id: "user-1",
      name: "Tester",
      email: "test@example.com",
      image: null,
      phone: "+33 4 95 78 54 00",
      passwordHash: null,
      emailVerified: null,
      defaultAddressId: null,
      createdAt: new Date(),
      isAdmin: false,
      isManager: false,
      isDriver: false,
    } satisfies User);

    const res = await POST(makeRequest({ phone: "+33 4 95 78 54 00" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { phone: "+33 4 95 78 54 00" },
    });
  });
});
