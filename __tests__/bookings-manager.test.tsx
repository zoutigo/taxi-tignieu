/** @jest-environment jsdom */
import React from "react";
import { render } from "@testing-library/react";
import { BookingsManager } from "@/components/bookings-manager";
import { useRouter } from "next/navigation";
import type { Booking } from "@prisma/client";

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

describe("BookingsManager", () => {
  it("affiche le prix estimé sur une seule ligne avec le libellé", () => {
    const { getByText } = render(
      <BookingsManager
        initialBookings={[
          {
            ...(baseBooking as Booking),
            id: 1,
            dateTime: new Date("2025-01-01T10:00:00Z"),
            pickup: {
              id: 1,
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
            dropoffId: 1,
            pickupId: 1,
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
});
