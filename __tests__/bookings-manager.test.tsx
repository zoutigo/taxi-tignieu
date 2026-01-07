/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { BookingsManager } from "@/components/bookings-manager";
import type { BookingStatus } from "@prisma/client";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const pushMock = jest.fn();
(jest.requireMock("next/navigation").useRouter as jest.Mock).mockReturnValue({ push: pushMock });

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
    priceCents: 53603,
    status: "PENDING" as BookingStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "u1",
    babySeat: false,
    driverId: null,
    customerId: null,
  };

  it("affiche le prix unique et permet la pagination", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const bookings = Array.from({ length: 12 }).map((_, idx) => ({ ...booking, id: idx + 1 }));
    const { getAllByText, getByText } = render(<BookingsManager initialBookings={bookings} />);

    // Le prix formaté apparaît (au moins une fois, aucune duplication inline)
    expect(getAllByText("536.03 €").length).toBeGreaterThan(0);

    // Pagination : page 1 puis page 2
    expect(getByText(/Page 1/)).toBeTruthy();
    fireEvent.click(getByText("Suivant"));
    await waitFor(() => expect(getByText(/Page 2/)).toBeTruthy());
  });

  it("redirige vers la page d'édition quand on clique sur Modifier", () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { getByText } = render(<BookingsManager initialBookings={[booking]} />);
    fireEvent.click(getByText("Modifier"));
    expect(pushMock).toHaveBeenCalledWith(`/espace-client/bookings/${booking.id}/edit`);
  });

  it("supprime une réservation après confirmation", async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/bookings") && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { getByText, getAllByText, queryByText } = render(
      <BookingsManager initialBookings={[booking]} />
    );
    fireEvent.click(getByText("Supprimer")); // open dialog
    const confirmButton = getAllByText("Supprimer")[1]; // in dialog
    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          (c) =>
            typeof c[0] === "string" &&
            (c[0] as string).startsWith("/api/bookings") &&
            (c[1] as RequestInit)?.method === "DELETE"
        )
      ).toBe(true)
    );
    expect(queryByText("Supprimer la réservation ?")).toBeTruthy();
  });
});
