/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";
import { fetchForecastAddressSuggestions } from "@/lib/address-search";
import type { BookingStatus } from "@prisma/client";

jest.mock("@/components/ui/select", () => {
  const SelectCtx = React.createContext<{ onValueChange?: (v: string) => void }>({});
  return {
    __esModule: true,
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
    }) => <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>,
    SelectTrigger: ({ children, ...rest }: { children: React.ReactNode }) => (
      <button {...rest}>{children}</button>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const ctx = React.useContext(SelectCtx);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

jest.mock("@/lib/address-search", () => ({
  __esModule: true,
  fetchForecastAddressSuggestions: jest.fn(),
  fetchAddressSuggestions: jest.fn(),
  normalizeAddressSuggestion: (v: unknown) => v,
}));

const drivers = [{ id: "d1", name: "Driver 1", email: "d1@test.com", phone: "0600000001" }];

const baseBooking: Parameters<typeof BookingsAdminTable>[0]["initialBookings"][number] = {
  id: "b1",
  pickupId: "a1",
  dropoffId: "a2",
  pickupLabel: "Ancienne adresse",
  pickupLat: 45,
  pickupLng: 5,
  dropoffLabel: "Arrivée",
  dropoffLat: 46,
  dropoffLng: 6,
  dateTime: new Date("2025-01-01T10:00:00Z"),
  pax: 1,
  luggage: 0,
  babySeat: false,
  priceCents: 1000,
  distanceKm: 1,
  status: "PENDING" as BookingStatus,
  userId: "u1",
  driverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerId: null,
  user: { name: "Alice", email: "alice@test.com", phone: "0102030405" },
  customer: null,
  driver: null,
  bookingNotes: [],
};

describe("BookingsAdminTable address edit flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    let quoteCalls = 0;
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url === "/api/forecast/distance") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 3.2 }),
        });
      }
      if (url === "/api/forecast/quote") {
        quoteCalls += 1;
        const body = init?.body ? JSON.parse(init.body as string) : {};
        // premier appel : prix de base pour le verrouillage
        if (quoteCalls === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ distanceKm: 3.2, price: 12.5 }),
          });
        }
        // appels suivants: prix = passengers*10 + luggage + (horaire nuit ? 5 : 0)
        const passengers = Number(body.passengers ?? 1);
        const luggage = Number(body.baggageCount ?? 0);
        const time = body.time as string | undefined;
        const night = time && Number(time.slice(0, 2)) < 6;
        const price = passengers * 10 + luggage + (night ? 5 : 0);
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 3.2, price }),
        });
      }
      if (url === "/api/admin/bookings") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return Promise.resolve({
          ok: true,
          json: async () => ({
            booking: {
              ...baseBooking,
              ...body,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }) as unknown as typeof fetch;
  });

  it("verrouille l'adresse après sélection (box + crayon)", async () => {
    (fetchForecastAddressSuggestions as jest.Mock).mockResolvedValue([
      {
        label: "23 Rue Sainte-Colette, 54500 Vandœuvre-lès-Nancy, France",
        city: "Vandœuvre-lès-Nancy",
        country: "France",
        lat: 48.65,
        lng: 6.17,
        street: "Rue Sainte-Colette",
        streetNumber: "23",
        postcode: "54500",
      },
    ]);

    render(
      <BookingsAdminTable
        initialBookings={[baseBooking]}
        drivers={drivers}
        currentUser={{ isAdmin: true }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getAllByLabelText("Modifier l'adresse")[0]);

    const input = screen.getByPlaceholderText("Adresse de départ");
    fireEvent.change(input, { target: { value: "23 rue sainte colette" } });
    fireEvent.click(screen.getByLabelText("Rechercher"));

    await waitFor(() =>
      expect(screen.getAllByText("23 Rue Sainte-Colette").length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByText("23 Rue Sainte-Colette"));

    await waitFor(() => {
      // La box verrouillée affiche bien l'adresse choisie
      const lockedBoxes = screen.getAllByTestId("address-locked-box");
      const pickupBox = lockedBoxes.find((el) =>
        el.textContent?.includes("23 Rue Sainte-Colette, 54500 Vandœuvre-lès-Nancy, France")
      );
      expect(pickupBox?.textContent).toContain(
        "23 Rue Sainte-Colette, 54500 Vandœuvre-lès-Nancy, France"
      );
      // Box non cliquable / non focusable et stylée comme verrouillée
      expect(pickupBox?.getAttribute("aria-readonly")).toBe("true");
      expect(pickupBox?.getAttribute("tabindex")).toBe("-1");
      expect(pickupBox?.className).toMatch(/pointer-events-none/);
      expect(pickupBox?.className).toMatch(/bg-primary\/15/);
      // Au moins une icône "modifier l'adresse" visible (départ)
      expect(screen.getAllByLabelText("Modifier l'adresse").length).toBeGreaterThanOrEqual(1);
      // Plus d'input de saisie ni de bouton Rechercher pour le départ
      expect(screen.queryByPlaceholderText("Adresse de départ")).toBeNull();
      expect(screen.queryByLabelText("Rechercher")).toBeNull();
    });

    // Recalcul distance/prix après sélection
    await waitFor(() => {
      const distInput = screen.getByLabelText(/Kilométrage \(km\)/i) as HTMLInputElement;
      expect(distInput.value).toBe("3.2");
    });
    await waitFor(() => {
      const priceInput = screen.getByLabelText(/Prix \(€\)/i) as HTMLInputElement;
      expect(priceInput.value).toBe("12.50");
    });

    const calls = (global.fetch as jest.Mock).mock.calls;
    const distanceCall = calls.find(([url]: [string]) => url === "/api/forecast/distance");
    const quoteCall = calls.find(([url]: [string]) => url === "/api/forecast/quote");
    expect(distanceCall).toBeTruthy();
    expect(quoteCall).toBeTruthy();
    const distancePayload = JSON.parse(distanceCall?.[1]?.body ?? "{}");
    expect(distancePayload.pickup).toEqual({ lat: 48.65, lng: 6.17 });
    expect(distancePayload.dropoff).toEqual({ lat: 46, lng: 6 });
    const quotePayload = JSON.parse(quoteCall?.[1]?.body ?? "{}");
    expect(quotePayload.pickup).toEqual({ lat: 48.65, lng: 6.17 });
    expect(quotePayload.dropoff).toEqual({ lat: 46, lng: 6 });
    expect(quotePayload.passengers).toBe(1);
    expect(quotePayload.baggageCount).toBe(0);
    expect(quotePayload.time).toBe("10:00");

    // Clamp négatif sur passagers / bagages
    const paxInput = screen.getByLabelText(/Passagers/i) as HTMLInputElement;
    fireEvent.change(paxInput, { target: { value: "-3" } });
    expect(paxInput.value).toBe("0");

    const bagsInput = screen.getByLabelText(/Bagages/i) as HTMLInputElement;
    fireEvent.change(bagsInput, { target: { value: "-5" } });
    expect(bagsInput.value).toBe("0");

    // Variation passagers / bagages : prix se met à jour, distance non rappelée
    fireEvent.change(paxInput, { target: { value: "3" } }); // expect price = 3*10 + 2 = 32
    fireEvent.change(bagsInput, { target: { value: "2" } });
    await waitFor(() => {
      const quoteCalls = (global.fetch as jest.Mock).mock.calls.filter(
        ([url]: [string]) => url === "/api/forecast/quote"
      ).length;
      expect(quoteCalls).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      const priceInput = screen.getByLabelText(/Prix \(€\)/i) as HTMLInputElement;
      expect(Number(priceInput.value)).toBeCloseTo(32, 2);
    });

    // Variation heure (jour/nuit) : quote se relance, distance toujours unique
    const timeInput = screen.getByLabelText(/Heure/i) as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "02:30" } }); // nuit => +5
    await waitFor(() => {
      const priceInput = screen.getByLabelText(/Prix \(€\)/i) as HTMLInputElement;
      expect(Number(priceInput.value)).toBeCloseTo(37, 2); // 32 + 5 nuit
    });

    const distCount = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => url === "/api/forecast/distance"
    ).length;
    const quoteCount = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => url === "/api/forecast/quote"
    ).length;
    expect(distCount).toBe(1); // distance uniquement après changement d'adresse
    expect(quoteCount).toBeGreaterThanOrEqual(3); // initial + pax/bags + heure (debounce-free)

    expect(fetchForecastAddressSuggestions).toHaveBeenCalledTimes(1);

    // Sauvegarde : vérifie que les labels/coordonnées partent bien au backend
    fireEvent.change(screen.getByPlaceholderText(/raisons de la modification/i), {
      target: { value: "motif test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sauvegarder/i }));
    await waitFor(() =>
      expect(
        (global.fetch as jest.Mock).mock.calls.some(([u]: [string]) => u === "/api/admin/bookings")
      ).toBe(true)
    );
    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([u]: [string]) => u === "/api/admin/bookings"
    );
    const patchPayload = JSON.parse(patchCall?.[1]?.body ?? "{}");
    expect(patchPayload.pickupLabel).toContain("23 Rue Sainte-Colette");
    expect(patchPayload.dropoffLabel).toBe("Arrivée");
    expect(patchPayload.pickupLat).toBe(48.65);
    expect(patchPayload.pickupLng).toBe(6.17);
    // Après modifications dans le formulaire, on a 3 passagers
    expect(patchPayload.passengers).toBe(3);

    // La carte (résumé) reflète bien les nouvelles adresses après fermeture du form inline
    await waitFor(() => {
      const matches = screen.getAllByText(
        /23 Rue Sainte-Colette, 54500 Vandœuvre-lès-Nancy, France/i
      );
      expect(matches.length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(
        screen.getAllByText(/Arrivée/i).some((el) => el.textContent?.includes("Arrivée"))
      ).toBe(true);
    });
    await waitFor(() => {
      const summaryLine = screen.queryAllByText(
        (content) => content.toLowerCase().includes("passag") && content.includes("3")
      );
      expect(summaryLine.length).toBeGreaterThan(0);
    });
  });
});
