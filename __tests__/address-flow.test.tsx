/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

describe("ReservationWizard address flow", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ status: "authenticated", data: null });
  });

  afterEach(() => {
    global.fetch = originalFetch as typeof fetch;
  });

  const renderWizard = () =>
    render(
      <ReservationWizard
        mode="edit"
        useStore={false}
        bookingId="bk-1"
        savedAddresses={savedAddresses}
        initialValues={{
          pickup: {
            label: "",
            lat: NaN,
            lng: NaN,
            city: "",
            postcode: "",
            country: "",
          },
          dropoff: {
            label: "",
            lat: NaN,
            lng: NaN,
            city: "",
            postcode: "",
            country: "",
          },
          date: "2025-12-01",
          time: "10:00",
          passengers: 1,
          luggage: 0,
          policiesAccepted: true,
        }}
      />
    );

  it("permet de sélectionner une adresse favorite", async () => {
    renderWizard();
    const selectTrigger = screen.getAllByRole("combobox")[0];
    fireEvent.click(selectTrigger);
    const option = screen.getAllByText("Maison")[0];
    fireEvent.click(option);

    const lines = screen.getAllByText(/10 Rue de Paris/);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("permet de rechercher et sélectionner une nouvelle adresse", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            label: "89 Rue du Travail 38230 Pont-de-Chéruy France",
            street: "Rue du Travail",
            streetNumber: "89",
            postcode: "38230",
            city: "Pont-de-Chéruy",
            country: "France",
            lat: 45.75,
            lng: 5.16,
          },
        ],
      }),
    } as unknown as typeof fetch);

    renderWizard();
    const input = screen.getByPlaceholderText(/Ex: 114B route de Crémieu/i);
    const continueBtn = screen.getByRole("button", { name: /Continuer/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "89 rue du travail 38230" } });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));

    await waitFor(() => expect(screen.getByText(/Rue du Travail/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Rue du Travail/));

    const matches = screen.getAllByText(/89 Rue du Travail/);
    expect(matches.length).toBeGreaterThan(0);

    expect(continueBtn.disabled).toBe(false);
  });

  it("permet de modifier une adresse déjà sélectionnée", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            label: "24 Avenue des Tests 69000 Lyon France",
            street: "Avenue des Tests",
            streetNumber: "24",
            postcode: "69000",
            city: "Lyon",
            country: "France",
            lat: 45.76,
            lng: 4.85,
          },
        ],
      }),
    } as unknown as typeof fetch);

    renderWizard();
    const input = screen.getByPlaceholderText(/Ex: 114B route de Crémieu/i);
    fireEvent.change(input, { target: { value: "24 avenue des tests" } });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));
    await waitFor(() => screen.getByText(/Avenue des Tests/));
    fireEvent.click(screen.getByText(/Avenue des Tests/));

    // Modifier: retaper dans le même input
    fireEvent.change(input, { target: { value: "24 avenue des tests modifiée" } });
    expect((input as HTMLInputElement).value).toBe("24 avenue des tests modifiée");
  });
});
