/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeaturedTripsPage from "@/app/dashboard/featured-trips/page";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, back: jest.fn() }),
}));

describe("FeaturedTripsPage", () => {
  const trips = [
    {
      id: "trip-1",
      title: "Tignieu → Aéroport",
      summary: "Trajet airport",
      featuredSlot: "TYPE",
      poiDestinations: [
        { id: "p1", label: "Lyon", distanceKm: 10, durationMinutes: 15, priceCents: 1200 },
      ],
    },
    {
      id: "trip-2",
      title: "Tignieu-Jameyzieu",
      summary: "Zone",
      featuredSlot: "ZONE",
      poiDestinations: [],
    },
  ];

  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ trips }),
    }) as any;
  });

  afterEach(() => {
    (global.fetch as jest.Mock | undefined)?.mockRestore?.();
  });

  it("affiche le titre, sous-titre et la liste des trajets", async () => {
    render(<FeaturedTripsPage />);

    expect(await screen.findByRole("heading", { name: /trajets mis en avant/i })).toBeTruthy();
    expect(
      await screen.findByText(/g[ée]rez le trajet type et les zones desservies/i)
    ).toBeTruthy();

    // Liste des cartes
    await waitFor(() => {
      expect(screen.getByText("Tignieu → Aéroport")).toBeTruthy();
      expect(screen.getByText("Tignieu-Jameyzieu")).toBeTruthy();
    });
  });

  it("redirige via le bouton retour", async () => {
    render(<FeaturedTripsPage />);
    await screen.findByText("Tignieu → Aéroport");
    fireEvent.click(screen.getByRole("button", { name: /retour au dashboard/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("ouvre la page de création avec le bouton ajouter", async () => {
    render(<FeaturedTripsPage />);
    await screen.findByText("Tignieu → Aéroport");
    fireEvent.click(screen.getByRole("button", { name: /créer un trajet/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/featured-trips/new");
  });
});
