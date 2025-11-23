/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { UsersTable } from "@/components/dashboard/users-table";

type BookingRow = {
  id: number;
  pickup: string;
  dropoff: string;
  status: string;
  createdAt: string;
  luggage: number;
  priceCents: number | null;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isDriver: boolean;
  bookings: BookingRow[];
};

const users: UserRow[] = [
  {
    id: "u1",
    name: "Alice",
    email: "alice@test.com",
    phone: "0102030405",
    isAdmin: false,
    isManager: false,
    isDriver: false,
    bookings: [
      {
        id: 1,
        pickup: "A",
        dropoff: "B",
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        luggage: 2,
        priceCents: 1000,
      },
      {
        id: 2,
        pickup: "C",
        dropoff: "D",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        luggage: 1,
        priceCents: null,
      },
    ],
  },
];

describe("UsersTable UI", () => {
  const originalError = console.error;
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((msg: unknown, ...rest: unknown[]) => {
      if (typeof msg === "string" && msg.includes("react-test-renderer is deprecated")) {
        return;
      }
      originalError(msg, ...rest);
    });
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeAll(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(() =>
      Promise.resolve({ ok: true })
    );
  });

  it("affiche le compteur de réservations complétées et totales", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<UsersTable initialUsers={users} />);
    });
    const root = tree!.root;
    const buttons = root.findAll((node) => node.type === "button");
    const textBtn = buttons.find((node) => {
      const kids = node.props.children;
      return (
        Array.isArray(kids) &&
        kids.some((child: unknown) => typeof child === "string" && child.includes("Réservations"))
      );
    })!;
    const kids = textBtn.props.children as unknown as string[];
    expect(kids.join("")).toContain("1/2");
  });

  it("ouvre la liste des réservations au clic", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<UsersTable initialUsers={users} />);
    });
    const root = tree!.root;
    const buttons = root.findAll((node) => node.type === "button");
    const btn = buttons.find((node) => {
      const kids = node.props.children;
      return (
        Array.isArray(kids) &&
        kids.some((child: unknown) => typeof child === "string" && child.includes("Réservations"))
      );
    })!;
    act(() => {
      (btn.props.onClick as (() => void) | undefined)?.();
    });
    const lines = root.findAll(
      (node) =>
        typeof node.props.className === "string" && node.props.className.includes("px-3 py-2")
    );
    expect(lines.length).toBe(2);
  });
});
