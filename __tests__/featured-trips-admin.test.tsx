/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import type { AddressData } from "@/lib/booking-utils";
import * as addressSearch from "@/lib/address-search";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
}));

type AddressAutocompleteProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (addr: AddressData) => void;
};

jest.mock("@/components/address-autocomplete", () => ({
  __esModule: true,
  AddressAutocomplete: ({ placeholder, value, onChange, onSelect }: AddressAutocompleteProps) => (
    <div>
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() =>
          onSelect(
            placeholder?.includes("arrivée")
              ? { label: "69125 Aéroport Lyon", lat: 45.73, lng: 5.08 }
              : { label: "38230 Tignieu-Jameyzieu", lat: 45.75, lng: 5.2 }
          )
        }
      >
        Choisir
      </button>
    </div>
  ),
}));

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

const mockAddress = (label: string, lat: number, lng: number) => ({
  label,
  lat,
  lng,
  street: "",
  streetNumber: "",
  postcode: "00000",
  city: "",
  country: "France",
});

describe("FeaturedTripsAdmin form", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const fetchForecastAddressSuggestions = jest.mocked(
      addressSearch.fetchForecastAddressSuggestions
    );
    fetchForecastAddressSuggestions.mockResolvedValue([
      mockAddress("38230 Tignieu-Jameyzieu, France", 45.75, 5.2),
    ]);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (typeof input === "string" && input.includes("/api/forecast/distance")) {
        return {
          ok: true,
          json: async () => ({ distanceKm: 7.5, durationMinutes: 12 }),
        } as Response;
      }
      if (typeof input === "string" && input.includes("/api/forecast/quote")) {
        return {
          ok: true,
          json: async () => ({ price: 12.34, distanceKm: 7.5, durationMinutes: 12 }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as jest.MockedFunction<typeof fetch>;
  });

  const fillRequired = async () => {
    render(<FeaturedTripsAdmin initialTrips={[]} />);
    fireEvent.change(screen.getByLabelText(/Titre \*/i), {
      target: { value: "Tignieu -> Aéroport" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /zone desservie/i })[0]); // open slot select
    fireEvent.click(screen.getByRole("button", { name: /Trajet type/i }));

    fireEvent.change(screen.getByPlaceholderText("Adresse de départ"), {
      target: { value: "38230" },
    });
    const chooseButtons = screen.getAllByRole("button", { name: "Choisir" });
    fireEvent.click(chooseButtons[0]);

    fireEvent.change(screen.getByPlaceholderText("Adresse d'arrivée"), {
      target: { value: "69125" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Choisir" })[1]);
  };

  it("renseigne adresses et calcule distance/durée/prix automatiquement", async () => {
    await fillRequired();
    await waitFor(() => {
      const distance = screen.getByLabelText(/Distance/) as HTMLInputElement;
      expect(distance.value).toBe("7.5");
    });
    expect((screen.getByLabelText(/Durée/) as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText(/Prix base/) as HTMLInputElement).value).toBe("1234"); // 12.34 euros -> 1234 cents
    const slugInput = screen.getByLabelText(/Slug \*/i) as HTMLInputElement;
    expect(slugInput.value).toBe("tignieu-aeroport");
    expect(slugInput.readOnly).toBe(true);
  });

  it("active le bouton créer quand tous les champs requis sont remplis", async () => {
    await fillRequired();
    await waitFor(() =>
      expect((screen.getByLabelText(/Distance/) as HTMLInputElement).value).toBe("7.5")
    );
    const submit = screen.getByRole("button", { name: /Créer/i });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it("affiche une erreur si le slug existe déjà", async () => {
    // distance + quote ok, then submit returns conflict
    const fetchForecastAddressSuggestions = jest.mocked(
      addressSearch.fetchForecastAddressSuggestions
    );
    fetchForecastAddressSuggestions.mockResolvedValue([
      mockAddress("38230 Tignieu-Jameyzieu, France", 45.75, 5.2),
    ]);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input.url ?? "");
      if (href.includes("/api/forecast/distance")) {
        return {
          ok: true,
          json: async () => ({ distanceKm: 7.5, durationMinutes: 12 }),
        } as Response;
      }
      if (href.includes("/api/forecast/quote")) {
        return { ok: true, json: async () => ({ price: 12.34 }) } as Response;
      }
      if (href.includes("/api/admin/featured-trips")) {
        return {
          ok: false,
          json: async () => ({ error: "Ce slug existe déjà", field: "slug" }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as jest.MockedFunction<typeof fetch>;

    await fillRequired();
    await waitFor(() =>
      expect((screen.getByLabelText(/Distance/) as HTMLInputElement).value).toBe("7.5")
    );
    await waitFor(() =>
      expect((screen.getByLabelText(/Slug \*/i) as HTMLInputElement).value).toBe("tignieu-aeroport")
    );
    const submit = screen.getByRole("button", { name: /Créer/i });
    fireEvent.click(submit);
    await waitFor(() =>
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2)
    );
    await waitFor(() =>
      expect(screen.queryAllByText(/slug existe déjà/i).length).toBeGreaterThan(0)
    );
  });

  it("affiche les erreurs zod sur les champs requis", async () => {
    render(<FeaturedTripsAdmin initialTrips={[]} />);
    const title = screen.getByLabelText(/Titre \*/i);
    fireEvent.change(title, { target: { value: "ab" } });
    fireEvent.change(title, { target: { value: "" } });
    const errs = await screen.findAllByText(
      (txt) => txt.toLowerCase().includes("3") && txt.toLowerCase().includes("character")
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it("empêche la saisie manuelle du slug", async () => {
    render(<FeaturedTripsAdmin initialTrips={[]} />);
    const slugInput = screen.getByLabelText(/Slug \*/i) as HTMLInputElement;
    expect(slugInput.readOnly).toBe(true);
    fireEvent.change(screen.getByLabelText(/Titre \*/i), { target: { value: "Nouveau trajet" } });
    await waitFor(() => expect(slugInput.value).toBe("nouveau-trajet"));
  });
});
