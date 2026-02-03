/** @jest-environment node */
import { PATCH as patchHandler } from "@/app/api/admin/bookings/route";

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const updateMock = jest.fn();
const findUniqueMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    $transaction: undefined,
  },
}));

describe("PATCH /api/admin/bookings", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { isAdmin: true } });
    findUniqueMock.mockResolvedValue({
      id: "b1",
      status: "PENDING",
      driverId: null,
      pickupId: "a1",
      dropoffId: "a2",
      dateTime: new Date("2026-02-13T01:24:00Z"),
      user: null,
      customer: null,
      driver: null,
      invoice: null,
    });
    updateMock.mockResolvedValue({
      id: "b1",
      pickup: { id: "a1" },
      dropoff: { id: "a2" },
    });
  });

  it("passe les labels et coords via nested update sur pickup/dropoff", async () => {
    const body = {
      id: "b1",
      pickupLabel: "23 Rue Sainte-Colette, 54500 Vandœuvre-lès-Nancy, France",
      dropoffLabel: "114 route de crémieu 38230 Tignieu-Jameyzieu France",
      pickupLat: 48.67,
      pickupLng: 6.18,
      dropoffLat: 45.75,
      dropoffLng: 5.2,
      passengers: 4,
      luggage: 6,
      priceCents: 56253,
      status: "PENDING",
      notes: "test",
      date: "2026-02-13",
      time: "01:24",
    };

    const req = new Request("http://localhost/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const res = await patchHandler(req);
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateArgs = updateMock.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "b1" });
    expect(updateArgs.data.pickup.update).toMatchObject({
      name: body.pickupLabel,
      street: body.pickupLabel,
      latitude: body.pickupLat,
      longitude: body.pickupLng,
    });
    expect(updateArgs.data.dropoff.update).toMatchObject({
      name: body.dropoffLabel,
      street: body.dropoffLabel,
      latitude: body.dropoffLat,
      longitude: body.dropoffLng,
    });
  });
});
