/** @jest-environment jsdom */
import React, { createContext, useContext } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ReservationWizard, type SavedAddressOption } from "@/components/reservation-wizard";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useSession } from "next-auth/react";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "authenticated", data: null })),
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
];

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReservationWizard saved addresses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = jest.fn();
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
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("permet de sélectionner une adresse sauvegardée pour pré-remplir le départ", async () => {
    const { getByText, getByRole, queryByText } = render(
      <ReservationWizard
        mode="create"
        useStore={false}
        savedAddresses={savedAddresses}
        initialValues={{ policiesAccepted: true }}
      />
    );

    fireEvent.click(getByText("Commencer la réservation"));

    const initialGeocodeCalls = mockFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/tarifs/geocode")
    ).length;

    const trigger = getByRole("button", { name: /choisir une adresse sauvegardée/i });
    fireEvent.click(trigger);
    fireEvent.click(getByRole("button", { name: /Maison/i }));

    fireEvent.click(getByText("Continuer"));

    await waitFor(() => expect(queryByText(/Arrivée/)).toBeTruthy());
    const geocodeCallsAfter = mockFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/tarifs/geocode")
    ).length;
    expect(geocodeCallsAfter).toBe(initialGeocodeCalls);
  });

  it("désactive le submit quand on veut enregistrer sans nom", async () => {
    (useSession as jest.Mock).mockReturnValue({
      status: "authenticated",
      data: { user: { phone: "+33123456789" } },
    });

    const readyAddress = {
      label: "114B route de Crémieu",
      street: "route de Crémieu",
      streetNumber: "114",
      postcode: "38230",
      city: "Tignieu-Jameyzieu",
      country: "France",
      lat: 45.7,
      lng: 4.9,
    };

    const { getByText, getByRole, getAllByText } = render(
      <ReservationWizard
        mode="create"
        useStore={false}
        savedAddresses={[]}
        initialValues={{
          pickup: readyAddress,
          dropoff: readyAddress,
          date: "2025-12-12",
          time: "10:00",
          policiesAccepted: true,
        }}
      />
    );

    fireEvent.click(getByText("Commencer la réservation"));
    fireEvent.click(getByText("Continuer")); // pickup ok
    await waitFor(() => expect(getByText(/Arrivée/)).toBeTruthy());
    fireEvent.click(getByText("Continuer")); // dropoff ok
    await waitFor(() => expect(getByText(/Estimation du tarif/)).toBeTruthy());
    fireEvent.click(getByText("Continuer")); // estimation -> confirmation (auth already ok)
    await waitFor(() => expect(getAllByText(/Confirmation/).length).toBeGreaterThan(0));

    const saveCheckbox = getByRole("checkbox");
    fireEvent.click(saveCheckbox);
    const submit = getByRole("button", { name: /confirmer/i });
    expect(submit.hasAttribute("disabled")).toBe(true);
  });

  it("active le submit quand un nom est fourni pour l'adresse à enregistrer", async () => {
    (useSession as jest.Mock).mockReturnValue({
      status: "authenticated",
      data: { user: { phone: "+33123456789" } },
    });

    const readyAddress = {
      label: "114B route de Crémieu",
      street: "route de Crémieu",
      streetNumber: "114",
      postcode: "38230",
      city: "Tignieu-Jameyzieu",
      country: "France",
      lat: 45.7,
      lng: 4.9,
    };

    const { getByText, getByRole, getByPlaceholderText, getAllByText } = render(
      <ReservationWizard
        mode="create"
        useStore={false}
        savedAddresses={[]}
        initialValues={{
          pickup: readyAddress,
          dropoff: readyAddress,
          date: "2025-12-12",
          time: "10:00",
          policiesAccepted: true,
        }}
      />
    );

    fireEvent.click(getByText("Commencer la réservation"));
    const saveCheckbox = getByRole("checkbox");
    fireEvent.click(saveCheckbox);
    const nameInput = await waitFor(() => getByPlaceholderText(/Nom pour cette adresse/i));
    fireEvent.change(nameInput, { target: { value: "Maison" } });

    fireEvent.click(getByText("Continuer"));
    await waitFor(() => expect(getByText(/Arrivée/)).toBeTruthy());
    fireEvent.click(getByText("Continuer"));
    fireEvent.click(getByText("Continuer"));
    await waitFor(() => expect(getByText(/Connexion|Confirmation/)).toBeTruthy());
    fireEvent.click(getByText("Continuer"));
    await waitFor(() => expect(getAllByText(/Confirmation/).length).toBeGreaterThan(0));

    expect(getByRole("button", { name: /confirmer/i }).hasAttribute("disabled")).toBe(false);
  });
});
