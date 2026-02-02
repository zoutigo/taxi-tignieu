/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReservationWizard, type SavedAddressOption } from "@/components/reservation-wizard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "authenticated", data: null })),
  signIn: jest.fn(),
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

describe("ReservationWizard dropoff validation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ status: "authenticated", data: null });
  });

  afterEach(() => {
    global.fetch = originalFetch as typeof fetch;
  });

  it("refuse une arrivée avec mêmes coordonnées que le départ", async () => {
    // Pas d'appel réseau nécessaire : on force une arrivée initiale identique au départ
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    }) as unknown as typeof fetch;

    render(
      <ReservationWizard
        mode="edit"
        useStore={false}
        bookingId="bk-1"
        savedAddresses={savedAddresses}
        initialValues={{
          pickup: {
            label: "10 Rue de Paris 75000 Paris France",
            lat: 1,
            lng: 2,
            city: "Paris",
            postcode: "75000",
            country: "France",
            street: "Rue de Paris",
            streetNumber: "10",
          },
          dropoff: {
            label: "10 Rue de Paris 75000 Paris France",
            lat: 1,
            lng: 2,
            city: "Paris",
            postcode: "75000",
            country: "France",
            street: "Rue de Paris",
            streetNumber: "10",
          },
          date: "2025-12-01",
          time: "10:00",
          passengers: 1,
          luggage: 0,
          policiesAccepted: true,
        }}
      />
    );

    // step 0 -> 1 (pickup already filled)
    const continueBtn = screen.getByRole("button", { name: /Continuer/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(false);
    fireEvent.click(continueBtn); // step 0 -> 1
    expect(continueBtn.disabled).toBe(false);
    fireEvent.click(continueBtn); // step 1 -> 2

    await waitFor(() => expect(screen.getByText(/Arrivée/)).toBeTruthy());
    // Étape 1 -> 2 puis 2 -> erreur sur même adresse
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => {
      expect(screen.queryByText(/arrivée doit être différente/i)).toBeTruthy();
    });
  });
});
