/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { ReservationWizard } from "@/components/reservation-wizard";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    status: "authenticated",
    data: { user: { phone: "+3300000000" } },
  })),
  signIn: jest.fn(),
}));

import type { AddressData } from "@/lib/booking-utils";

jest.mock("@/components/address-autocomplete", () => ({
  AddressAutocomplete: ({ onSelect }: { onSelect: (v: AddressData) => void }) => (
    <button data-testid="mock-address" onClick={() => onSelect(sampleAddress)}>
      mock-address
    </button>
  ),
}));

const pushMock = jest.fn();
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as AppRouterInstance);

const sampleAddress = {
  label: "114 Route de Crémieu 38230 Tignieu-Jameyzieu France",
  street: "Route de Crémieu",
  streetNumber: "114",
  postcode: "38230",
  city: "Tignieu-Jameyzieu",
  country: "France",
  lat: 45.7,
  lng: 5.15,
};
const sampleAddressB = {
  ...sampleAddress,
  label: "10 Rue de Paris 75000 Paris France",
  street: "Rue de Paris",
  streetNumber: "10",
  postcode: "75000",
  city: "Paris",
  lat: 48.86,
  lng: 2.35,
};

describe("ReservationWizard recapitulatif", () => {
  it("affiche toutes les infos saisies dans le récap", async () => {
    const { getByText, getByRole } = render(
      <ReservationWizard
        mode="create"
        useStore={true}
        initialValues={{
          pickup: sampleAddress,
          dropoff: sampleAddressB,
          date: "2026-02-05",
          time: "03:47",
          passengers: 3,
          luggage: 3,
          notes: "erreur corrigée",
        }}
      />
    );

    fireEvent.click(getByText(/Commencer la réservation/i));
    fireEvent.click(getByRole("button", { name: /Continuer/i })); // étape 1 -> 2
    await screen.findAllByText(/Arrivée/i);

    fireEvent.click(getByRole("button", { name: /Continuer/i })); // étape 2 -> 3
    await screen.findAllByText(/Estimation du tarif/i);

    fireEvent.click(getByRole("button", { name: /Continuer/i })); // étape 3 -> 4
    await screen.findAllByText(/Connexion|Confirmation/i);

    await waitFor(() => expect(screen.getByText(/Récapitulatif/i)).toBeTruthy(), {
      timeout: 1000,
    });

    const departLine = screen.getByText(/Départ :/).closest("li");
    const arriveeLine = screen.getByText(/Arrivée :/).closest("li");
    const dateLine = screen.getByText(/Date \/ heure/).closest("li");
    const passagersLine = screen.getByText(/Passagers/).closest("li");
    const bagagesLine = screen.getByText(/Bagages/).closest("li");
    const notesLine = screen.getByText(/Notes/).closest("li");

    expect(departLine?.textContent).toContain(sampleAddress.label);
    expect(arriveeLine?.textContent).toContain(sampleAddressB.label);
    expect(dateLine?.textContent).toContain("2026-02-05 03:47");
    expect(passagersLine?.textContent).toContain("3");
    expect(bagagesLine?.textContent).toContain("3");
    expect(notesLine?.textContent).toContain("erreur corrigée");
  });
});
