/** @jest-environment jsdom */
import React, { createContext, useContext } from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import ReservationPage from "@/components/reservation-page";
import { ReservationWizard } from "@/components/reservation-wizard";
import { useRouter } from "next/navigation";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated", data: null })),
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

const SelectCtx = createContext<{ onValueChange?: (v: string) => void }>({});
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const ctx = useContext(SelectCtx);
    return (
      <button data-value={value} onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
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
          lat: 45.72,
          lng: 5.08,
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
          json: async () => ({ distanceKm: 10, durationMinutes: 20, price: 25 }),
        });
      }
      if (url.startsWith("/api/bookings")) {
        return Promise.resolve({ ok: true, json: async () => ({ booking: {} }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { getByPlaceholderText, getByText, getByLabelText } = render(<ReservationPage />);

    fireEvent.click(getByText("Commencer la réservation"));

    fireEvent.change(getByPlaceholderText("Ex: 114B route de Crémieu, Tignieu"), {
      target: { value: "114B route de Crémieu" },
    });
    fireEvent.click(getByText("Rechercher"));
    fireEvent.click(await screen.findByRole("button", { name: /114 route de crémieu/i }));
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByPlaceholderText("Ex: Aéroport de Lyon"));
    fireEvent.change(getByPlaceholderText("Ex: Aéroport de Lyon"), {
      target: { value: "Aéroport de Lyon" },
    });
    fireEvent.click(getByText("Rechercher"));
    fireEvent.click(await screen.findByRole("button", { name: /aéroport de lyon/i }));
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
          (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/forecast/quote")
        )
      ).toBe(true)
    );

    // Après estimation on passe à l'étape suivante (connexion si non loggé, sinon confirmation)
    expect(screen.queryAllByText(/Connexion|Confirmation/).length).toBeGreaterThan(0);
  });
});
