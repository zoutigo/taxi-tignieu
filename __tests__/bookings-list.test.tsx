/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { BookingsList } from "@/components/bookings-list";

type FetchResponse = { ok: boolean; json: () => Promise<unknown> };
const mockFetch = jest.fn<Promise<FetchResponse>, [RequestInfo | URL, RequestInit?]>();

const booking = {
  id: 1,
  pickupId: 1,
  dropoffId: 2,
  pickup: {
    id: 1,
    name: "A",
    street: "A",
    streetNumber: "1",
    postalCode: "69000",
    city: "Lyon",
    country: "France",
    latitude: 45.75,
    longitude: 4.85,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  dropoff: {
    id: 2,
    name: "B",
    street: "B",
    streetNumber: "2",
    postalCode: "69000",
    city: "Lyon",
    country: "France",
    latitude: 45.76,
    longitude: 4.86,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  dateTime: new Date("2025-01-01T10:00:00.000Z"),
  pax: 2,
  luggage: 1,
  bookingNotes: [],
  priceCents: null,
  status: "PENDING" as const,
  userId: "u1",
  driverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerId: null,
  babySeat: false,
};

describe("BookingsList actions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    (global as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;
    (global as unknown as { confirm: () => boolean }).confirm = () => true;
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("supprime une réservation via DELETE", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BookingsList initialBookings={[booking]} />);
    });

    const deleteBtn = tree!.root.find(
      (node) => node.type === "button" && node.props.children === "Supprimer"
    );
    await act(async () => {
      (deleteBtn.props.onClick as () => void)();
    });
    const confirms = tree!.root.findAll(
      (node) => node.type === "button" && node.props.children === "Supprimer"
    );
    const confirm = confirms[confirms.length - 1];
    await act(async () => {
      (confirm.props.onClick as () => void)();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("édite une réservation via PATCH", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ booking: { ...booking, pickup: "New" } }),
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BookingsList initialBookings={[booking]} />);
    });

    const editBtn = tree!.root.find(
      (node) => node.type === "button" && node.props.children === "Modifier"
    );
    await act(async () => {
      (editBtn.props.onClick as () => void)();
    });

    const saveBtn = tree!.root.find(
      (node) => node.type === "button" && node.props.children === "Sauvegarder"
    );
    await act(async () => {
      (saveBtn.props.onClick as () => void)();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
