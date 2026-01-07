/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import ReservationPage from "@/components/reservation-page";
import { useRouter } from "next/navigation";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated", data: null })),
  signIn: jest.fn(),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
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

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReservationPage wizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("enchaine les étapes jusqu'à l'estimation", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
      }
      if (url.startsWith("/api/tarifs/search")) {
        return Promise.resolve({ ok: true, json: async () => ({ results: [] }) });
      }
      if (url.startsWith("/api/tarifs/quote")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 10, durationMinutes: 20, price: 25 }),
        });
      }
      if (url.startsWith("/api/bookings")) {
        return Promise.resolve({ ok: true, json: async () => ({ booking: {} }) });
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
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { getByPlaceholderText, getByText, queryByText, getByLabelText } = render(
      <ReservationPage />
    );

    fireEvent.click(getByText("Commencer la réservation"));

    fireEvent.change(getByPlaceholderText("Ex: 114B route de Crémieu, Tignieu"), {
      target: { value: "114B route de Crémieu" },
    });
    await waitFor(() => expect(getByText("Continuer").getAttribute("disabled")).toBeNull());
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByPlaceholderText("Ex: Aéroport de Lyon"));
    fireEvent.change(getByPlaceholderText("Ex: Aéroport de Lyon"), {
      target: { value: "Aéroport de Lyon" },
    });
    fireEvent.click(getByText("Continuer"));

    // étape estimation : renseigner date/heure pour éviter l'erreur
    await waitFor(() => getByLabelText("Date"));
    const dateInput = getByLabelText("Date") as HTMLInputElement;
    const timeInput = getByLabelText("Heure") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-11-24" } });
    fireEvent.change(timeInput, { target: { value: "12:50" } });

    fireEvent.click(getByText("Continuer"));
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/tarifs/quote")
        )
      ).toBe(true)
    );

    // Après estimation on passe à l'étape 4 (connexion)
    expect(queryByText("Connexion")).toBeTruthy();
  });
});
