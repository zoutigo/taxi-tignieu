/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";
import type { BookingStatus } from "@prisma/client";

jest.mock("@/components/ui/select", () => {
  const SelectCtx = React.createContext<{ onValueChange?: (v: string) => void }>({});
  return {
    __esModule: true,
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
    }) => <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>,
    SelectTrigger: ({ children, ...rest }: { children: React.ReactNode }) => (
      <button {...rest}>{children}</button>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const ctx = React.useContext(SelectCtx);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

const drivers = [{ id: "d1", name: "Driver 1", email: "d1@test.com", phone: "0600000001" }];

const baseBooking: Parameters<typeof BookingsAdminTable>[0]["initialBookings"][number] = {
  id: "b1",
  pickupId: "a1",
  dropoffId: "a2",
  pickupLabel: "Ancienne adresse",
  pickupLat: 45,
  pickupLng: 5,
  dropoffLabel: "Arrivée",
  dropoffLat: 46,
  dropoffLng: 6,
  dateTime: new Date("2026-02-13T01:24:00Z"),
  pax: 6,
  luggage: 6,
  babySeat: false,
  priceCents: 35800,
  distanceKm: 1,
  status: "PENDING" as BookingStatus,
  userId: "u1",
  driverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerId: null,
  user: { name: "Alice", email: "alice@test.com", phone: "0102030405" },
  customer: null,
  driver: null,
  bookingNotes: [],
};

describe("BookingsAdminTable confirm flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url === "/api/admin/bookings") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return Promise.resolve({
          ok: true,
          json: async () => ({
            booking: {
              ...baseBooking,
              ...body,
              status: "CONFIRMED",
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;
  });

  it("garde les adresses et passagers après confirmation", async () => {
    render(
      <BookingsAdminTable
        initialBookings={[baseBooking]}
        drivers={drivers}
        currentUser={{ isAdmin: true }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirmer/i }));
    fireEvent.click(screen.getByText("Driver 1"));
    fireEvent.change(screen.getByPlaceholderText(/note de confirmation/i), {
      target: { value: "ok" },
    });
    fireEvent.click(screen.getByRole("button", { name: /valider l'assignation/i }));

    await waitFor(() =>
      expect(
        (global.fetch as jest.Mock).mock.calls.some(([u]: [string]) => u === "/api/admin/bookings")
      ).toBe(true)
    );
    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([u]: [string]) => u === "/api/admin/bookings"
    );
    const payload = JSON.parse(patchCall?.[1]?.body ?? "{}");
    expect(payload.passengers).toBe(6);
    expect(payload.driverId).toBe("d1");
    expect(payload.status).toBe("CONFIRMED");
    expect(payload.notes).toBe("ok");

    await waitFor(() => {
      expect(screen.getAllByText(/Ancienne adresse/).length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.queryAllByText(/Arrivée/).length).toBeGreaterThan(0);
    });
  });
});
