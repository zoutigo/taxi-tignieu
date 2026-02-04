/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import type { AddressData } from "@/lib/booking-utils";

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
  locked?: boolean;
};

jest.mock("@/components/address-autocomplete", () => ({
  __esModule: true,
  AddressAutocomplete: ({
    placeholder,
    value,
    onChange,
    onSelect,
    locked,
  }: AddressAutocompleteProps) => (
    <div>
      <input
        placeholder={placeholder}
        value={value}
        readOnly={locked}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => onSelect({ label: `nouvelle ${placeholder}`, lat: 1, lng: 2 })}
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

describe("FeaturedTripsAdmin edit form", () => {
  const initialTrip = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    slug: "tignieu-aeroport",
    title: "Tignieu --> Aeroport",
    summary: "Lyon Saint-Exupéry",
    featuredSlot: "TYPE" as const,
    pickupLabel: "38230 Tignieu-Jameyzieu, France",
    dropoffLabel: "69125 Aéroport Lyon Saint-Exupéry, France",
    distanceKm: 7.59,
    durationMinutes: 11,
    basePriceCents: 1226,
    priority: 90,
    active: true,
    badge: "Trajet Type",
    zoneLabel: "tignieu",
    heroImageUrl: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    pushMock.mockReset();
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
      return { ok: true, json: async () => ({ trip: initialTrip }) } as Response;
    }) as jest.MockedFunction<typeof fetch>;
  });

  it("préfille les valeurs existantes et garde le slug", () => {
    render(
      <FeaturedTripsAdmin
        initialTrips={[initialTrip]}
        showList={false}
        showForm
        initialEditId={initialTrip.id}
      />
    );
    expect((screen.getByLabelText(/Titre \*/i) as HTMLInputElement).value).toBe(initialTrip.title);
    expect((screen.getByLabelText(/Slug \*/i) as HTMLInputElement).value).toBe(initialTrip.slug);
    expect((screen.getByLabelText(/Slug \*/i) as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByPlaceholderText("Adresse de départ") as HTMLInputElement).value).toBe(
      initialTrip.pickupLabel
    );
    expect((screen.getByPlaceholderText("Adresse d'arrivée") as HTMLInputElement).value).toBe(
      initialTrip.dropoffLabel
    );
    expect((screen.getByLabelText(/Distance/) as HTMLInputElement).value).toBe(
      initialTrip.distanceKm.toString()
    );
    const submit = screen.getByRole("button", { name: /Mettre à jour/i }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/Titre \*/i), { target: { value: initialTrip.title } });
    return waitFor(() => expect(submit.disabled).toBe(false));
  });

  it("recalcule distance et prix après changement d'adresses", async () => {
    render(
      <FeaturedTripsAdmin
        initialTrips={[initialTrip]}
        showList={false}
        showForm
        initialEditId={initialTrip.id}
      />
    );
    fireEvent.click(screen.getAllByText("Choisir")[0]);
    fireEvent.click(screen.getAllByText("Choisir")[1]);
    await waitFor(() =>
      expect((screen.getByLabelText(/Distance/) as HTMLInputElement).value).toBe("7.5")
    );
    expect((screen.getByLabelText(/Prix base/) as HTMLInputElement).value).toBe("1234");
  });

  it("soumet en PATCH et redirige vers la liste", async () => {
    render(
      <FeaturedTripsAdmin
        initialTrips={[initialTrip]}
        showList={false}
        showForm
        initialEditId={initialTrip.id}
      />
    );
    await screen.findByDisplayValue(initialTrip.title);
    const submit = screen.getByRole("button", { name: /mettre à jour/i });
    fireEvent.click(submit);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/featured-trips"));
  });
});
