import { GET, PATCH } from "@/app/api/settings/tarifs/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    tariffConfig: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

const mockedAuth = auth as unknown as jest.Mock;
const mockedFind = prisma.tariffConfig.findFirst as unknown as jest.Mock;
const mockedUpsert = prisma.tariffConfig.upsert as unknown as jest.Mock;

describe("api/settings/tarifs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne le fallback si aucune config n'est présente", async () => {
    mockedFind.mockResolvedValue(null);
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.baseCharge).toBeCloseTo(defaultTariffConfig.baseChargeCents / 100);
  });

  it("refuse les non-admin pour la mise à jour", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: false, isManager: false } });
    const req = new Request("http://localhost/api/settings/tarifs", {
      method: "PATCH",
      body: JSON.stringify({
        baseCharge: 3.1,
        kmA: 1,
        kmB: 2,
        kmC: 3,
        kmD: 4,
        waitPerHour: 30,
        baggageFee: 2,
        fifthPassenger: 2.5,
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("met à jour les tarifs si admin", async () => {
    mockedAuth.mockResolvedValue({ user: { isAdmin: true } });
    mockedUpsert.mockResolvedValue({ id: 1 });

    const req = new Request("http://localhost/api/settings/tarifs", {
      method: "PATCH",
      body: JSON.stringify({
        baseCharge: 3.2,
        kmA: 1.2,
        kmB: 1.3,
        kmC: 1.6,
        kmD: 2.1,
        waitPerHour: 30,
        baggageFee: 2,
        fifthPassenger: 2.5,
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ baseChargeCents: 320 }),
        update: expect.objectContaining({ kmCentsD: 210 }),
      })
    );
  });
});
