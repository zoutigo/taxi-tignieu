/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import ReservationPage from "@/components/reservation-page";
import { ReservationWizard } from "@/components/reservation-wizard";
import { useRouter, useSearchParams } from "next/navigation";
import { computePriceEuros, defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    status: "authenticated",
    data: { user: { phone: "0600000000" } },
  })),
  signIn: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

jest.mock("@/components/reservation-page", () => ({
  __esModule: true,
  default: () => (
    <ReservationWizard
      mode="create"
      successRedirect="/espace-client/bookings"
      useStore
      savedAddresses={[]}
    />
  ),
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
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
      }
      if (url.startsWith("/api/forecast/geocode")) {
        const body = opts?.body ? JSON.parse(opts.body.toString()) : { address: "" };
        const addr = (body.address as string).toLowerCase();
        const first = {
          lat: 45.75,
          lng: 4.85,
          country: "France",
          city: "Tignieu-Jameyzieu",
          postcode: "38230",
          street: "route de Crémieu",
          streetNumber: "114",
          formatted_address: "114B route de Crémieu, 38230 Tignieu-Jameyzieu, France",
          label: "114B route de Crémieu, 38230 Tignieu-Jameyzieu, France",
        };
        const second = {
          lat: 45.9,
          lng: 4.7,
          country: "France",
          city: "Lyon",
          postcode: "69000",
          street: "Aéroport de Lyon",
          formatted_address: "Aéroport de Lyon, 69000 Lyon, France",
          label: "Aéroport de Lyon, 69000 Lyon, France",
        };
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: addr.includes("aéroport") ? [second] : [first] }),
        });
      }
      if (url.startsWith("/api/forecast/quote")) {
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

    const startBtn = root.find(
      (n) => n.type === "button" && n.props.children === "Commencer la réservation"
    );
    await act(async () => {
      (startBtn.props.onClick as () => void)();
    });

    const pickupInput = root.find(
      (n) =>
        n.type === "input" &&
        typeof n.props.placeholder === "string" &&
        n.props.placeholder.includes("Crémieu")
    );

    await act(async () => {
      (pickupInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "114B route de Crémieu" },
      });
    });
    const textFrom = (val: unknown): string => {
      if (typeof val === "string" || typeof val === "number") return String(val);
      if (Array.isArray(val)) return val.map(textFrom).join("");
      if (val && typeof val === "object" && "props" in val) {
        return textFrom((val as { props?: { children?: unknown } }).props?.children);
      }
      return "";
    };
    const searchButtons = root.findAll(
      (n) => n.type === "button" && /rechercher/i.test(textFrom(n.props.children))
    );
    expect(searchButtons.length).toBeGreaterThan(0);
    const pickupSearchBtn = searchButtons[0];
    await act(async () => {
      (pickupSearchBtn.props.onClick as () => void)();
    });

    const pickupSuggestion = root.find(
      (n) => n.type === "button" && textFrom(n.props.children).toLowerCase().includes("crémieu")
    );
    await act(async () => {
      (pickupSuggestion.props.onClick as () => void)();
    });

    // Step 1 -> 2
    const nextBtn = root.find((n) => n.type === "button" && n.props.children === "Continuer");
    await act(async () => {
      (nextBtn.props.onClick as () => void)();
    });

    const dropInput = root.find(
      (n) =>
        n.type === "input" &&
        typeof n.props.placeholder === "string" &&
        n.props.placeholder.includes("Aéroport de Lyon")
    );
    await act(async () => {
      (dropInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "Aéroport de Lyon" },
      });
    });
    const dropSearchButtons = root.findAll(
      (n) => n.type === "button" && /rechercher/i.test(textFrom(n.props.children))
    );
    expect(dropSearchButtons.length).toBeGreaterThan(0);
    const dropSearchBtn = dropSearchButtons[1] ?? dropSearchButtons[0];
    await act(async () => {
      (dropSearchBtn.props.onClick as () => void)();
    });
    const dropSuggestion = root.find(
      (n) => n.type === "button" && textFrom(n.props.children).toLowerCase().includes("aéroport")
    );
    await act(async () => {
      (dropSuggestion.props.onClick as () => void)();
    });

    // Step 2 -> 3
    await act(async () => {
      (nextBtn.props.onClick as () => void)();
    });

    // Fill date/time (quote auto recalculé)
    const dateInput = root.find((n) => n.type === "input" && n.props.type === "date");
    const timeInput = root.find((n) => n.type === "input" && n.props.type === "time");
    await act(async () => {
      (dateInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "2025-11-24" },
      });
      (timeInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "12:50" },
      });
    });

    await act(async () => {
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
      (n) => n.type === "span" && textFromChildren(n.props.children).includes("€")
    );
    const text = textFromChildren(priceSpan.props.children);
    const match = text.match(/([0-9.,]+)\s*€/);
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
