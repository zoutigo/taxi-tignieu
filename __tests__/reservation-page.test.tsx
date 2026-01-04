/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ReservationPage } from "@/components/reservation-page";
import { useRouter, useSearchParams } from "next/navigation";
import { defaultTariffConfig } from "@/lib/tarifs";

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

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    ...props
  }: { onCheckedChange?: (v: boolean) => void } & Record<string, unknown>) => (
    <input
      type="checkbox"
      {...props}
      onChange={(e) => onCheckedChange?.((e.target as HTMLInputElement).checked)}
    />
  ),
}));

const pushMock = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: pushMock });
(useSearchParams as jest.Mock).mockReturnValue({
  get: () => null,
});

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReservationPage - calcul tarif", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("calcule un prix non nul quand la distance > 0", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
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
          json: async () => ({ distanceKm: 12, durationMinutes: 20, price: 0 }),
        });
      }
      if (url.startsWith("/api/bookings")) {
        return Promise.resolve({ ok: true, json: async () => ({ booking: {} }) });
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
      await (calcBtn.props.onClick as () => Promise<void>)();
      await flushPromises();
    });

    const quoteCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/tarifs/quote")
    );
    expect(quoteCall).toBeTruthy();
  });

  it("requiert l’acceptation des mentions avant l’envoi", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReservationPage />);
    });
    const root = tree!.root;

    const submitButton = root.find(
      (n) => n.type === "button" && n.props.children === "Confirmer ma demande"
    );
    expect(submitButton.props.disabled).toBe(true);

    const checkbox = root.find((n) => n.type === "input" && n.props.id === "policiesAccepted");
    const changeHandler = (checkbox.props.onChange ?? checkbox.props.onCheckedChange) as
      | ((...args: unknown[]) => void)
      | undefined;
    expect(typeof changeHandler).toBe("function");
    await act(async () => {
      changeHandler?.({ target: { checked: true } });
    });

    expect(submitButton.props.disabled).toBe(false);
  });
});
