/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ReservationPage } from "@/components/reservation-page";
import { useRouter, useSearchParams } from "next/navigation";
import { computePriceEuros, defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated" })),
  signIn: jest.fn(),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
(useSearchParams as jest.Mock).mockReturnValue({ get: () => null });

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReservationPage price display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("affiche un prix non nul quand distance > 0 (fallback local)", async () => {
    mockFetch.mockImplementation((url: string) => {
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
            label: "114B route de Crémieu, France",
          }),
        });
      }
      if (url.startsWith("/api/tarifs/quote")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 51, durationMinutes: 48, price: 0 }),
        });
      }
      if (url.startsWith("/api/bookings")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReservationPage />);
    });
    const root = tree!.root;

    const pickupInput = root.find(
      (n) =>
        n.type === "input" &&
        typeof n.props.placeholder === "string" &&
        n.props.placeholder.includes("Crémieu")
    );
    const dropInput = root.find(
      (n) =>
        n.type === "input" &&
        typeof n.props.placeholder === "string" &&
        n.props.placeholder.includes("Aéroport de Lyon")
    );

    await act(async () => {
      (pickupInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "114B route de Crémieu" },
      });
      (dropInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "Aéroport de Lyon" },
      });
    });

    const calcBtn = root.find(
      (n) => n.type === "button" && n.props.children === "Calculer le tarif"
    );
    await act(async () => {
      (calcBtn.props.onClick as () => Promise<void>)();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const textFromChildren = (val: unknown): string => {
      if (typeof val === "string" || typeof val === "number") return String(val);
      if (Array.isArray(val)) return val.map(textFromChildren).join("");
      if (val && typeof val === "object" && "props" in val) {
        return textFromChildren((val as { props?: { children?: unknown } }).props?.children);
      }
      return "";
    };

    const priceSpan = root.find(
      (n) => n.type === "span" && textFromChildren(n.props.children).includes("Estimation")
    );
    const text = textFromChildren(priceSpan.props.children);
    const match = text.match(/Estimation:\s*([0-9.,]+)/);
    expect(match).toBeTruthy();
    const value = match ? parseFloat(match[1].replace(",", ".")) : 0;
    const expected = computePriceEuros(
      51,
      "A",
      { baggageCount: 0, fifthPassenger: false, waitMinutes: 0 },
      defaultTariffConfig
    );
    expect(value).toBeCloseTo(expected, 1);
  });
});
