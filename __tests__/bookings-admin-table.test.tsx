/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";

type BookingRow = Parameters<typeof BookingsAdminTable>[0]["initialBookings"][number];

const baseBooking: BookingRow = {
  id: 1,
  pickup: "Départ A",
  dropoff: "Arrivée B",
  dateTime: new Date("2025-01-01T10:00:00Z"),
  pax: 1,
  luggage: 0,
  babySeat: false,
  notes: "",
  priceCents: 1500,
  status: "PENDING",
  userId: "u1",
  driverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerId: null,
  user: { name: "Alice", email: "alice@test.com", phone: "0102030405" },
  customer: null,
  driver: null,
};

const drivers = [
  { id: "d1", name: "Driver 1", email: "d1@test.com", phone: "0600000001" },
  { id: "d2", name: "Driver 2", email: "d2@test.com", phone: "0600000002" },
];

const textFromChildren = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (child && typeof child === "object" && "props" in child) {
          // best effort extraction of nested text
          return textFromChildren((child as { props?: { children?: unknown } }).props?.children);
        }
        return "";
      })
      .join("");
  }
  return "";
};

describe("BookingsAdminTable UI", () => {
  beforeEach(() => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ booking: baseBooking }) })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("affiche date, prix et lignes départ/arrivée", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BookingsAdminTable initialBookings={[baseBooking]} drivers={drivers} currentUser={null} />
      );
    });
    const root = tree!.root;
    const hasText = (needle: string) =>
      root.findAll((node) => textFromChildren(node.props.children).includes(needle)).length > 0;
    expect(hasText("Départ : Départ A")).toBe(true);
    expect(hasText("Arrivée : Arrivée B")).toBe(true);
    expect(hasText("€")).toBe(true);
  });

  it("filtre par statut et pagine", () => {
    const many = Array.from({ length: 12 }).map((_, idx) => ({
      ...baseBooking,
      id: idx + 1,
      status: "CONFIRMED" as const,
    }));
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BookingsAdminTable initialBookings={many} drivers={drivers} currentUser={null} />
      );
    });
    const root = tree!.root;
    const confirmBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Confirmée"
    );
    act(() => {
      (confirmBtn.props.onClick as () => void)();
    });
    const pageLabel = root.find((node) => textFromChildren(node.props.children).includes("Page"));
    expect(textFromChildren(pageLabel.props.children)).toContain("1/");
    const nextBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Suivant"
    );
    act(() => {
      (nextBtn.props.onClick as () => void)();
    });
    const pageLabelAfter = root.find((node) =>
      textFromChildren(node.props.children).includes("Page")
    );
    expect(textFromChildren(pageLabelAfter.props.children)).toContain("2/");
  });

  it("permet à un driver de prendre une course", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ booking: { ...baseBooking, driverId: "d1", status: "CONFIRMED" } }),
      })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={[baseBooking]}
          drivers={drivers}
          currentUser={{ id: "d1", isDriver: true }}
        />
      );
    });
    const root = tree!.root;
    const takeBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Prendre la course"
    );
    await act(async () => {
      (takeBtn.props.onClick as () => Promise<void>)();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/bookings",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"driverId":"d1"'),
      })
    );
  });
});
