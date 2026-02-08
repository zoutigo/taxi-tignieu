/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, refresh: refreshMock, back: jest.fn() }),
}));

jest.mock("@/components/address-autocomplete", () => ({
  AddressAutocomplete: ({ value, locked, onRequestEdit, onChange, onSelect, placeholder }: any) => (
    <div>
      {locked ? (
        <button type="button" onClick={onRequestEdit}>
          Modifier
        </button>
      ) : null}
      <input
        aria-label={placeholder ?? "adresse"}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onSelect?.({
            label: value || "Adresse choisie",
            lat: 45.7,
            lng: 4.9,
          })
        }
      >
        Choisir
      </button>
    </div>
  ),
}));

const makeJsonResponse = (data: any, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }) as Response;

const buildFetchMock = (overrides: Record<string, () => any> = {}) => {
  return jest.fn(async (url: string) => {
    if (url.includes("/api/admin/addresses")) {
      return makeJsonResponse({ address: { id: crypto.randomUUID?.() ?? "addr-mock" } });
    }
    if (url.includes("/api/admin/featured-trips")) {
      return overrides["/api/admin/featured-trips"]?.() ?? makeJsonResponse({ ok: true });
    }
    if (url.includes("/api/forecast/distance")) {
      return makeJsonResponse({ distanceKm: 12.3, durationMinutes: 20 });
    }
    if (url.includes("/api/forecast/quote")) {
      return makeJsonResponse({ price: 35, distanceKm: 12.3, durationMinutes: 20 });
    }
    if (url.includes("/api/forecast/geocode")) {
      return makeJsonResponse({ lat: 45.7, lng: 4.9 });
    }
    return makeJsonResponse({});
  });
};

const sampleTrip = {
  id: "11111111-2222-4333-8444-555555555555",
  slug: "tignieu-aeroport",
  title: "Tignieu → Aéroport",
  summary: "Trajet airport",
  featuredSlot: "TYPE" as const,
  pickupLabel: "Ancienne adresse",
  pickupAddressId: "11111111-1111-4111-8111-111111111111",
  pickupAddress: { id: "11111111-1111-4111-8111-111111111111", label: "Ancienne adresse" },
  priority: 1,
  active: true,
  poiDestinations: [
    {
      id: "poi-1",
      label: "Ancien POI",
      dropoffAddressId: "22222222-2222-4222-8222-222222222222",
      dropoffAddress: { id: "22222222-2222-4222-8222-222222222222", label: "Ancienne destination" },
      distanceKm: 10,
      durationMinutes: 15,
      priceCents: 1200,
      order: 0,
    },
  ],
};

describe("FeaturedTripsAdmin edit form", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip("remplit tous les champs, sélectionne les adresses et affiche le succès", async () => {
    const fetchMock = buildFetchMock({
      "/api/admin/featured-trips": () => makeJsonResponse({ ok: true }),
    });
    global.fetch = fetchMock as any;

    const { container } = render(
      <FeaturedTripsAdmin
        initialTrips={[sampleTrip as any]}
        initialEditId="11111111-2222-4333-8444-555555555555"
        showList={false}
        showForm
      />
    );

    await screen.findByDisplayValue("Tignieu → Aéroport");

    fireEvent.change(screen.getByPlaceholderText("Transfert aéroport"), {
      target: { value: "Nouveau titre" },
    });
    fireEvent.change(screen.getByPlaceholderText("transfert-aeroport"), {
      target: { value: "nouveau-slug" },
    });
    fireEvent.change(screen.getByPlaceholderText("Tarif journée"), {
      target: { value: "Badge test" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nord-Isère"), { target: { value: "Zone test" } });
    fireEvent.change(screen.getByPlaceholderText("Description courte"), {
      target: { value: "Résumé à jour" },
    });

    fireEvent.click(screen.getByRole("button", { name: /mettre à jour/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          (c) => typeof c[0] === "string" && c[0].includes("/api/admin/featured-trips")
        )
      ).toBe(true)
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/featured-trips"));
    await waitFor(() => expect(screen.queryByText(/mis à jour/i)).not.toBeNull());
    fireEvent.click(screen.getByLabelText(/Fermer le message/i));
    expect(screen.queryByText(/mis à jour/i)).toBeNull();
  });

  it.skip("affiche l'erreur serveur et la ferme", async () => {
    const fetchMock = buildFetchMock({
      "/api/admin/featured-trips": () => makeJsonResponse({ error: "Boom" }, 400),
    });
    global.fetch = fetchMock as any;

    const { container } = render(
      <FeaturedTripsAdmin
        initialTrips={[sampleTrip as any]}
        initialEditId="trip-1"
        showList={false}
        showForm
      />
    );

    await screen.findByDisplayValue("Tignieu → Aéroport");
    fireEvent.click(screen.getByRole("button", { name: /mettre à jour/i }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          (c) => typeof c[0] === "string" && c[0].includes("/api/admin/featured-trips")
        )
      ).toBe(true)
    );
    await waitFor(() => expect(screen.queryByText(/Boom/i)).not.toBeNull());
    fireEvent.click(screen.getByLabelText(/Fermer le message/i));
    expect(screen.queryByText(/Boom/i)).toBeNull();
  });

  it("signale les champs obligatoires manquants", async () => {
    const fetchMock = jest.fn(() => makeJsonResponse({}));
    global.fetch = fetchMock as any;

    render(<FeaturedTripsAdmin initialTrips={[]} showList={false} showForm />);

    fireEvent.click(screen.getByRole("button", { name: /créer/i }));
    await waitFor(() =>
      expect(screen.queryAllByText(/Too small|at least 3|>=3 characters/i).length).toBeGreaterThan(
        0
      )
    );
  });
});
