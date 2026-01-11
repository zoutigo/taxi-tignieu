/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import renderer, { act } from "react-test-renderer";
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
type NoteWithAuthor = BookingNote & { author?: { name?: string | null } | null };

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
            driverName: null,
            driverPhone: null,
            babySeat: false,
            bookingNotes: [],
            invoice: null,
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
      driverName: null,
      driverPhone: null,
      babySeat: false,
      priceCents: 1000,
      bookingNotes: [] as NoteWithAuthor[],
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

  it("masque les actions annuler/modifier pour une réservation annulée ou terminée", () => {
    const cancelled: BookingRow = {
      ...(baseBooking as Booking),
      id: "b-cancelled",
      dateTime: new Date("2025-01-03T10:00:00Z"),
      pickup: null as Address | null,
      dropoff: null as Address | null,
      pickupId: "a1",
      dropoffId: "a2",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      driverId: null,
      driverName: null,
      driverPhone: null,
      babySeat: false,
      priceCents: 1000,
      status: "CANCELLED",
      bookingNotes: [] as NoteWithAuthor[],
    };
    const completed: BookingRow = {
      ...(baseBooking as Booking),
      id: "b-completed",
      dateTime: new Date("2025-01-03T10:00:00Z"),
      pickup: null as Address | null,
      dropoff: null as Address | null,
      pickupId: "a1",
      dropoffId: "a2",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      driverId: null,
      driverName: null,
      driverPhone: null,
      babySeat: false,
      priceCents: 1000,
      status: "COMPLETED",
      bookingNotes: [] as NoteWithAuthor[],
    };

    const { queryByText } = render(<BookingsManager initialBookings={[cancelled, completed]} />);

    expect(queryByText(/^Annuler$/)).toBeNull();
    expect(queryByText(/^Modifier$/)).toBeNull();
  });

  it("affiche la note obligatoire avant annulation, montre une confirmation puis met le statut à CANCELLED", async () => {
    const cancellable: BookingRow = {
      ...(baseBooking as Booking),
      id: "b-cancel",
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
      status: "PENDING",
      bookingNotes: [] as NoteWithAuthor[],
    };

    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ booking: { ...cancellable, status: "CANCELLED" } }),
      })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    jest.useFakeTimers();
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BookingsManager initialBookings={[cancellable]} />);
    });
    const root = tree!.root;

    const deleteBtn = root.find((node) => {
      const n = node as { type?: unknown; props?: { children?: unknown } };
      if (n.type !== "button" || !Array.isArray(n.props?.children)) return false;
      return n.props.children.some(
        (child) =>
          (typeof child === "string" && child === "Annuler") ||
          (child as { props?: { children?: unknown } })?.props?.children === "Annuler"
      );
    });
    await act(async () => {
      (deleteBtn.props.onClick as () => void)();
    });

    const textarea = root.find((node) => (node as { type?: unknown }).type === "textarea");
    const confirm = root.find((node) => {
      const n = node as { type?: unknown; props?: { children?: unknown } };
      return (
        n.type === "button" &&
        ((Array.isArray(n.props?.children) &&
          n.props.children.includes("Annuler la réservation")) ||
          n.props?.children === "Annuler la réservation")
      );
    });

    expect(confirm.props.disabled).toBe(true);

    await act(async () => {
      (textarea.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "Annulation test" },
      });
    });

    expect(confirm.props.disabled).toBe(false);
    expect(confirm.props.className).toContain("cursor-pointer");

    await act(async () => {
      (confirm.props.onClick as () => void)();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    const confirmMsg = root.find(
      (node) =>
        typeof node.props?.className === "string" &&
        node.props.className.includes("bg-emerald-50") &&
        (node.props.children as string | string[]).toString().includes("Réservation annulée")
    );
    expect(confirmMsg).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    const confirmMsgsAfter = root.findAll(
      (node) =>
        typeof node.props?.className === "string" && node.props.className.includes("bg-emerald-50")
    );
    expect(confirmMsgsAfter.length).toBe(0);
    jest.useRealTimers();
    const statusLabelNode = root.find((node) => {
      const n = node as { props?: { className?: string; children?: unknown } };
      return (
        typeof n.props?.className === "string" &&
        n.props.className.includes("inline-flex") &&
        (Array.isArray(n.props.children)
          ? n.props.children.includes("Annulée")
          : n.props.children === "Annulée")
      );
    });
    expect(statusLabelNode).toBeTruthy();
  });

  it("affiche les détails (id, chauffeur, notes) quand on clique sur Détails", () => {
    const cancellable: BookingRow = {
      ...(baseBooking as Booking),
      id: "b-detail",
      dateTime: new Date("2025-01-01T10:00:00Z"),
      pickup: null as Address | null,
      dropoff: null as Address | null,
      pickupId: "a1",
      dropoffId: "a2",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      driverId: "driver-123",
      driverName: "John Driver",
      driverPhone: "0601020304",
      babySeat: false,
      priceCents: 1000,
      status: "PENDING",
      bookingNotes: [
        {
          id: "n1",
          content: "Note de test",
          bookingId: "b-detail",
          authorId: "u1",
          author: { name: "Alice" } as unknown as NoteWithAuthor["author"],
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:00:00Z"),
        } as unknown as NoteWithAuthor,
      ],
    };

    const { getByText, queryByText } = render(<BookingsManager initialBookings={[cancellable]} />);

    expect(queryByText("Note de test")).toBeNull();
    fireEvent.click(getByText("Détails"));
    expect(getByText(/b-detail/)).toBeTruthy();
    expect(getByText(/John Driver/)).toBeTruthy();
    expect(getByText(/0601020304/)).toBeTruthy();
    expect(getByText("Note de test")).toBeTruthy();
    expect(getByText(/Alice/)).toBeTruthy();
  });
});
