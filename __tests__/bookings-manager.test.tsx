/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { BookingsManager } from "@/components/bookings-manager";
import { useRouter } from "next/navigation";
import type { Booking } from "@prisma/client";
import type { Address, BookingNote } from "@prisma/client";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });

const baseBooking: Partial<Booking> = {
  pax: 1,
  luggage: 0,
  priceCents: 1234,
  status: "PENDING",
};

type BookingRow = Parameters<typeof BookingsManager>[0]["initialBookings"][number];

describe("BookingsManager", () => {
  it("affiche le prix estimé sur une seule ligne avec le libellé", () => {
    const { getByText } = render(
      <BookingsManager
        initialBookings={[
          {
            ...(baseBooking as Booking),
            id: "b1",
            dateTime: new Date("2025-01-01T10:00:00Z"),
            pickup: {
              id: "a1",
              name: null,
              street: "rue A",
              streetNumber: "10",
              postalCode: "75000",
              city: "Paris",
              country: "France",
              latitude: 0,
              longitude: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            dropoff: null,
            dropoffId: "a2",
            pickupId: "a1",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: null,
            driverId: null,
            babySeat: false,
          },
        ]}
      />
    );

    expect(getByText(/12\.34 €/)).toBeTruthy();
    expect(getByText(/\(Prix estimé\)/)).toBeTruthy();
  });

  it("pagine les réservations et change la page", () => {
    const many: BookingRow[] = Array.from({ length: 12 }).map((_, idx) => ({
      ...(baseBooking as Booking),
      id: `b${idx + 1}`,
      dateTime: new Date("2025-01-01T10:00:00Z"),
      pickup: null as Address | null,
      dropoff: null as Address | null,
      pickupId: "a1",
      dropoffId: "a2",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      driverId: null,
      babySeat: false,
      priceCents: 1000,
      bookingNotes: [] as BookingNote[],
    }));

    const { getAllByText, getByDisplayValue, queryAllByText } = render(
      <BookingsManager initialBookings={many} />
    );

    expect(getAllByText("Page 1 / 2").length).toBeGreaterThan(0);
    fireEvent.click(getAllByText("Suivant")[0]);
    expect(getAllByText("Page 2 / 2").length).toBeGreaterThan(0);

    const input = getByDisplayValue("10") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(getAllByText("Page 1 / 3").length).toBeGreaterThan(0);
    expect(queryAllByText(/\(Prix estimé\)/).length).toBeGreaterThan(0);
  });
});
