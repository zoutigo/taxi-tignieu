/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, refresh: refreshMock, back: jest.fn() }),
}));

// Mock react-hook-form: keep everything but make handleSubmit call the callback immediately
jest.mock("react-hook-form", () => {
  const original = jest.requireActual("react-hook-form");
  return {
    ...original,
    useForm: (opts: any) => {
      const form = original.useForm(opts);
      form.handleSubmit = (fn: any) => () => fn(form.getValues());
      return form;
    },
  };
});

// Mock Select (Radix) with a tiny context (avoid unknown props on DOM)
jest.mock("@/components/ui/select", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const SelectContext = ReactActual.createContext<{ onValueChange?: (v: string) => void }>({});
  return {
    Select: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children, ...rest }: any) => (
      <button type="button" aria-label="slot-trigger" {...rest}>
        {children}
      </button>
    ),
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => {
      const ctx = ReactActual.useContext(SelectContext);
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  };
});

// Mock address autocomplete to keep tests deterministic
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
            label: value || placeholder || "Adresse",
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

const buildFetchMock = (overrides: Record<string, () => any> = {}) =>
  jest.fn(async (url: string) => {
    if (url.includes("/api/admin/addresses")) {
      return makeJsonResponse({ address: { id: crypto.randomUUID?.() ?? "addr-mock" } });
    }
    if (url.includes("/api/admin/featured-trips")) {
      return overrides["/api/admin/featured-trips"]?.() ?? makeJsonResponse({ ok: true });
    }
    if (url.includes("/api/forecast/distance")) {
      return makeJsonResponse({ distanceKm: 10, durationMinutes: 15 });
    }
    if (url.includes("/api/forecast/quote")) {
      return makeJsonResponse({ price: 25, distanceKm: 10, durationMinutes: 15 });
    }
    return makeJsonResponse({});
  });

describe("FeaturedTripsAdmin – création", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).crypto = {
      ...(global as any).crypto,
      randomUUID: () => "uuid-mock",
    };
  });

  const renderForm = (fetchImpl: any) => {
    global.fetch = fetchImpl;
    return render(<FeaturedTripsAdmin initialTrips={[]} showList={false} showForm />);
  };

  it("remplit les champs, ajoute une POI et crée le trajet avec succès", async () => {
    const fetchMock = buildFetchMock();
    renderForm(fetchMock);

    const slugInput = (await screen.findByPlaceholderText(
      "transfert-aeroport"
    )) as HTMLInputElement;
    fireEvent.change(screen.getByPlaceholderText("Transfert aéroport"), {
      target: { value: "Trajet test" },
    });
    await waitFor(() => expect(slugInput.value).toBe("trajet-test"));

    // Slot (mocked select)
    fireEvent.click(screen.getByLabelText("slot-trigger"));
    fireEvent.click(screen.getByText(/Type \(Hero\)/i));

    // Adresse de départ
    fireEvent.change(screen.getAllByLabelText(/Chercher une adresse/i)[0], {
      target: { value: "Adresse départ" },
    });
    fireEvent.click(screen.getAllByText("Choisir")[0]);

    // Ajouter une POI
    fireEvent.click(screen.getByRole("button", { name: /ajouter une poi/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ex: Bourgoin-Jallieu/i), {
      target: { value: "Destination A" },
    });
    const poiAddressInput = screen
      .getAllByLabelText(/Adresse de destination|Chercher une adresse/i)
      .slice(-1)[0];
    fireEvent.change(poiAddressInput, {
      target: { value: "Adresse arrivée" },
    });
    fireEvent.click(screen.getAllByText("Choisir").slice(-1)[0]);
    fireEvent.click(screen.getByRole("button", { name: /Valider la POI/i }));
    await screen.findByText(/Destination #1/i);
    await screen.findByDisplayValue("Destination A");

    // Bouton submit (dernier bouton de la page)
    const buttons = screen.getAllByRole("button");
    const submit = buttons.reverse().find((b) => /créer/i.test(b.textContent || ""));
    if (!submit) throw new Error("Bouton Créer introuvable");
    fireEvent.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    await waitFor(() => {
      const urls = calledUrls.map((u) =>
        typeof u === "string" ? u : (u as any)?.url || "non-string"
      );
      if (!urls.some((u) => typeof u === "string" && u.includes("/api/admin/featured-trips"))) {
        throw new Error(`fetch calls: ${JSON.stringify(urls)}`);
      }
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/featured-trips"));
  });

  it("bloque la soumission s'il manque la POI et affiche l'erreur", async () => {
    const fetchMock = buildFetchMock();
    renderForm(fetchMock);

    await screen.findByPlaceholderText("transfert-aeroport");
    fireEvent.change(screen.getByPlaceholderText("Transfert aéroport"), {
      target: { value: "Trajet test" },
    });
    fireEvent.change(screen.getAllByLabelText(/Chercher une adresse/i)[0], {
      target: { value: "Adresse départ" },
    });
    fireEvent.click(screen.getAllByText("Choisir")[0]);

    fireEvent.click(screen.getByRole("button", { name: /Créer/i }));

    await screen.findByText(/Ajoutez au moins une destination POI/i);
    expect(
      fetchMock.mock.calls.some(
        (c) => typeof c[0] === "string" && c[0].includes("/api/admin/featured-trips")
      )
    ).toBe(false);
  });

  it("stoppe l'auto-slug après modification manuelle", async () => {
    renderForm(buildFetchMock());
    const titleInput = screen.getByPlaceholderText("Transfert aéroport") as HTMLInputElement;
    const slugInput = screen.getByPlaceholderText("transfert-aeroport") as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "Premier titre" } });
    await waitFor(() => expect(slugInput.value).toBe("premier-titre"));

    fireEvent.change(slugInput, { target: { value: "mon-slug" } });
    fireEvent.change(titleInput, { target: { value: "Second titre" } });

    expect(slugInput.value).toBe("mon-slug");
  });
});
