/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
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

const pushMock = jest.fn();
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as AppRouterInstance);

const pickupAddr = {
  label: "114 Route de Crémieu 38230 Tignieu-Jameyzieu France",
  street: "Route de Crémieu",
  streetNumber: "114",
  postcode: "38230",
  city: "Tignieu-Jameyzieu",
  country: "France",
  lat: 45.7,
  lng: 5.15,
};

const dropoffAddr = {
  label: "10 Rue de Paris 75000 Paris France",
  street: "Rue de Paris",
  streetNumber: "10",
  postcode: "75000",
  city: "Paris",
  country: "France",
  lat: 48.86,
  lng: 2.35,
};

describe("ReservationWizard state persistence across steps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    // jsdom n'implémente pas scrollIntoView
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = jest.fn();
  });

  it("garde l'adresse départ en revenant via les pastilles d'étape", async () => {
    render(
      <ReservationWizard
        mode="create"
        useStore={true}
        initialValues={{
          pickup: pickupAddr,
          dropoff: dropoffAddr,
          date: "2026-02-05",
          time: "03:47",
          passengers: 2,
          luggage: 1,
        }}
      />
    );

    fireEvent.click(screen.getByText(/Commencer la réservation/i));
    // on force l'affichage du récap (étape 5) puis on revient via la timeline
    fireEvent.click(screen.getByLabelText("Aller à l'étape 5"));
    fireEvent.click(screen.getByLabelText("Aller à l'étape 1"));
    expect(screen.getAllByText(pickupAddr.label).length).toBeGreaterThan(0);
  });

  it.skip("garde l'adresse arrivée et la date/heure en revenant en arrière", async () => {
    render(
      <ReservationWizard
        mode="create"
        useStore={true}
        initialValues={{
          pickup: pickupAddr,
          dropoff: dropoffAddr,
          date: "2026-02-05",
          time: "03:47",
          passengers: 3,
          luggage: 2,
          notes: "note",
        }}
      />
    );

    fireEvent.click(screen.getByText(/Commencer la réservation/i));
    // le récap doit afficher les valeurs persistées
    await screen.findAllByText(/Récapitulatif/i);
    expect(screen.getAllByText(dropoffAddr.label).length).toBeGreaterThan(0);
    expect(screen.getByText(/2026-02-05 03:47/)).toBeTruthy();
  });
});
