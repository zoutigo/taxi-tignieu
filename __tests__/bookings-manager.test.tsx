/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { BookingsManager } from "@/components/bookings-manager";
import { defaultTariffConfig, computePriceEuros } from "@/lib/tarifs";
import type { BookingStatus } from "@prisma/client";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("BookingsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const booking = {
    id: 1,
    pickupId: 10,
    dropoffId: 11,
    pickup: {
      id: 10,
      name: "114B route de Crémieu",
      street: "route de Crémieu",
      streetNumber: "114B",
      postalCode: "38230",
      city: "Tignieu",
      country: "France",
      latitude: 45.75,
      longitude: 4.85,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    dropoff: {
      id: 11,
      name: "Aéroport de Lyon",
      street: "Aéroport de Lyon",
      streetNumber: null,
      postalCode: "69125",
      city: "Lyon",
      country: "France",
      latitude: 45.72,
      longitude: 5.08,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    dateTime: new Date("2025-01-02T10:00:00Z"),
    pax: 2,
    luggage: 1,
    notes: "",
    priceCents: 0,
    status: "PENDING" as BookingStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "u1",
    babySeat: false,
    driverId: null,
    customerId: null,
  };

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("calcule un tarif non nul et l'envoie lors de la sauvegarde", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
      }
      if (url.startsWith("/api/tarifs/search")) {
        return Promise.resolve({ ok: true, json: async () => ({ results: [] }) });
      }
      if (url.startsWith("/api/tarifs/geocode")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            lat: 45.75,
            lng: 4.85,
            country: "France",
            city: "Lyon",
            postcode: "69000",
            label: "114B route de Crémieu, France",
          }),
        });
      }
      if (url.startsWith("/api/tarifs/quote")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 12, durationMinutes: 20, price: 0 }),
        });
      }
      if (url.startsWith("/api/bookings") && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ booking: { ...booking, priceCents: 5000 } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BookingsManager initialBookings={[booking]} />);
    });
    const root = tree!.root;

    const editBtn = root.find((n) => n.type === "button" && n.props.children === "Modifier");
    await act(async () => {
      (editBtn.props.onClick as () => void)();
    });

    const calcBtn = root.find(
      (n) => n.type === "button" && n.props.children === "Recalculer le tarif"
    );
    await act(async () => {
      (calcBtn.props.onClick as () => Promise<void>)();
      await flush();
    });

    const expected = computePriceEuros(12, "A", { baggageCount: 1 }, defaultTariffConfig);
    expect(expected).toBeGreaterThan(0);

    const saveBtn = root.find((n) => n.type === "button" && n.props.children === "Enregistrer");
    await act(async () => {
      (saveBtn.props.onClick as () => Promise<void>)();
      await flush();
    });

    const patchCall = mockFetch.mock.calls.find(
      (c) =>
        typeof c[0] === "string" &&
        (c[0] as string).startsWith("/api/bookings") &&
        (c[1] as RequestInit | undefined)?.method === "PATCH"
    );
    expect(patchCall).toBeTruthy();
    const body = patchCall && (patchCall[1] as RequestInit).body;
    const parsed = typeof body === "string" ? JSON.parse(body) : {};
    expect(parsed.estimatedPrice).toBeGreaterThan(0);
  });
});
