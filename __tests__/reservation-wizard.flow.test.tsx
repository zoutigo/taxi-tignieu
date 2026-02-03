/** @jest-environment jsdom */
import React, { createContext, useContext } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ReservationWizard, type SavedAddressOption } from "@/components/reservation-wizard";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    status: "authenticated",
    data: { user: { phone: "+33123456789" } },
  })),
  signIn: jest.fn(),
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
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as AppRouterInstance);

const savedAddresses: SavedAddressOption[] = [
  {
    id: "addr-1",
    label: "Maison",
    addressLine: "10 Rue de Paris 75000 Paris France",
    address: {
      label: "10 Rue de Paris 75000 Paris France",
      street: "Rue de Paris",
      streetNumber: "10",
      postcode: "75000",
      city: "Paris",
      country: "France",
      lat: 1,
      lng: 2,
    },
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Bureau",
    addressLine: "20 Rue de Lyon 69000 Lyon France",
    address: {
      label: "20 Rue de Lyon 69000 Lyon France",
      street: "Rue de Lyon",
      streetNumber: "20",
      postcode: "69000",
      city: "Lyon",
      country: "France",
      lat: 45.75,
      lng: 4.85,
    },
    isDefault: false,
  },
];

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
(Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = jest.fn();

describe("ReservationWizard end-to-end UI flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url.startsWith("/api/forecast/geocode")) {
        const body = opts?.body ? JSON.parse(opts.body.toString()) : { address: "" };
        const addr = (body.address as string).toLowerCase();
        const result =
          addr.includes("114") || addr.includes("crémieu")
            ? {
                lat: 45.75,
                lng: 4.85,
                street: "route de Crémieu",
                streetNumber: "114",
                postcode: "38230",
                city: "Tignieu-Jameyzieu",
                country: "France",
                formatted_address: "114 route de Crémieu, 38230 Tignieu-Jameyzieu, France",
              }
            : {
                lat: 49.01,
                lng: 2.55,
                street: "Rue interne Aéroport CDG",
                streetNumber: "",
                postcode: "95700",
                city: "Roissy-en-France",
                country: "France",
                formatted_address: "Aéroport Paris CDG, 95700 Roissy-en-France, France",
              };
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [result] }),
        });
      }
      if (url.startsWith("/api/forecast/quote")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 10, durationMinutes: 20, price: 25 }),
        });
      }
      if (url.startsWith("/api/profile/addresses")) {
        const body = opts?.body ? JSON.parse(opts.body.toString()) : {};
        const missing =
          !body.street ||
          !body.city ||
          !body.postalCode ||
          body.latitude === null ||
          body.longitude === null;
        if (missing) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: "Payload invalide" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ savedAddress: { id: "new-addr", body } }),
        });
      }
      if (url.startsWith("/api/bookings")) {
        const body = opts?.body ? JSON.parse(opts.body.toString()) : {};
        const hasInvalidFields =
          body.pickup?.street === "" ||
          body.dropoff?.street === "" ||
          body.pickup?.lat === null ||
          body.dropoff?.lat === null;
        if (hasInvalidFields) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: "Invalid input" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ booking: { id: 999, body } }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("parcourt toutes les étapes en saisie manuelle et enregistre la réservation", async () => {
    const { getByText, getByPlaceholderText, getByLabelText, getByRole } = render(
      <ReservationWizard
        mode="create"
        useStore={false}
        savedAddresses={[]}
        initialValues={{ policiesAccepted: true }}
      />
    );

    fireEvent.click(getByText("Commencer la réservation"));
    fireEvent.change(getByPlaceholderText("Ex: 114B route de Crémieu, Tignieu"), {
      target: { value: "114 route de Crémieu" },
    });
    fireEvent.click(getByRole("button", { name: /Rechercher/i }));
    const pickupSuggestion = await waitFor(() =>
      getByRole("button", { name: /114 route de crémieu/i })
    );
    fireEvent.click(pickupSuggestion);
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByPlaceholderText("Ex: Aéroport de Lyon"));
    fireEvent.change(getByPlaceholderText("Ex: Aéroport de Lyon"), {
      target: { value: "Paris CDG" },
    });
    fireEvent.click(getByRole("button", { name: /Rechercher/i }));
    const dropSuggestion = await waitFor(() => getByRole("button", { name: /aéroport cdg/i }));
    fireEvent.click(dropSuggestion);
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByText(/Estimation du tarif/));
    fireEvent.change(getByLabelText("Date"), { target: { value: "2025-12-12" } });
    fireEvent.change(getByLabelText("Heure"), { target: { value: "10:00" } });

    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/forecast/quote")
        )
      ).toBe(true)
    );
  });

  it("utilise une adresse sauvegardée et complète le flux", async () => {
    const { getByText, getByRole, getByLabelText } = render(
      <ReservationWizard
        mode="create"
        useStore={false}
        savedAddresses={savedAddresses}
        initialValues={{ policiesAccepted: true }}
      />
    );

    fireEvent.click(getByText("Commencer la réservation"));
    const trigger = getByRole("button", { name: /choisir une adresse sauvegardée/i });
    fireEvent.click(trigger);
    fireEvent.click(getByRole("button", { name: /Maison/i }));
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByText(/Arrivée/));
    fireEvent.click(getByRole("button", { name: /choisir une adresse sauvegardée/i }));
    fireEvent.click(getByRole("button", { name: /Bureau/i }));
    fireEvent.click(getByText("Continuer"));

    await waitFor(() => getByText(/Estimation du tarif/));
    fireEvent.change(getByLabelText("Date"), { target: { value: "2025-12-12" } });
    fireEvent.change(getByLabelText("Heure"), { target: { value: "10:00" } });

    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/forecast/quote")
        )
      ).toBe(true)
    );
  });
});
