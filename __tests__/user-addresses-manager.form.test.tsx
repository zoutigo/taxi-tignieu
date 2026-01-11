/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserAddressesManager } from "@/components/user-addresses-manager";
import type { Address, UserAddress } from "@prisma/client";

const suggestion = {
  label: "Rue du Travail, Pont-de-Chéruy, France",
  streetNumber: "89",
  street: "Rue du Travail",
  postcode: "38230",
  city: "Pont-de-Chéruy",
  country: "France",
  lat: 45.7,
  lng: 5.15,
};

const buildAddress = (overrides?: Partial<Address>): Address => ({
  id: "addr-1",
  name: null,
  street: "Rue 1",
  streetNumber: "10",
  postalCode: "75001",
  city: "Paris",
  country: "France",
  latitude: 1,
  longitude: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildUserAddress = (id: string, label: string, overrides?: Partial<UserAddress>) =>
  ({
    id,
    label,
    userId: "user-1",
    addressId: id,
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultFor: null,
    ...overrides,
  }) as UserAddress;

type SavedAddressTest = UserAddress & { address: Address; isDefault: boolean };

describe("UserAddressesManager flows", () => {
  beforeEach(() => {
    // @ts-expect-error mock fetch
    global.fetch = jest.fn((url: string, options?: RequestInit) => {
      if (url.startsWith("/api/tarifs/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [suggestion] }),
        }) as unknown as Response;
      }
      if (url.startsWith("/api/profile/addresses") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              savedAddress: {
                ...buildUserAddress("addr-new", "Maison"),
                address: buildAddress({
                  id: "addr-new-phys",
                  street: suggestion.street,
                  streetNumber: suggestion.streetNumber,
                  postalCode: suggestion.postcode,
                  city: suggestion.city,
                  country: suggestion.country,
                  latitude: suggestion.lat,
                  longitude: suggestion.lng,
                }),
                isDefault: true,
              },
            }),
        }) as unknown as Response;
      }
      if (url.startsWith("/api/profile/addresses/") && options?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              address: {
                ...buildUserAddress("addr-2", "Bureau"),
                address: buildAddress({ id: "addr-2" }),
                isDefault: true,
              },
            }),
        }) as unknown as Response;
      }
      if (url.startsWith("/api/profile/addresses/") && options?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, defaultAddressId: null }),
        }) as unknown as Response;
      }
      if (url.startsWith("/api/tarifs/geocode")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(null),
        }) as unknown as Response;
      }
      throw new Error(`Unhandled fetch ${url}`);
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("creates a new address after selecting a suggestion and filling label", async () => {
    render(<UserAddressesManager initialAddresses={[]} />);

    // ouvre le formulaire via le bouton (déjà ouvert par défaut quand aucune adresse)
    screen.getByRole("button", { name: /fermer le formulaire/i });

    const search = screen.getByPlaceholderText(/rue de la république/i);
    fireEvent.change(search, { target: { value: "89 rue du travail" } });

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/tarifs/search"))
    );

    let suggestionBtn: HTMLElement | null = null;
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      suggestionBtn = buttons.find((b) =>
        (b.textContent || "").toLowerCase().includes("rue du travail")
      ) as HTMLElement | null;
      expect(suggestionBtn).toBeTruthy();
    });
    if (!suggestionBtn) {
      throw new Error("Suggestion not found");
    }
    fireEvent.click(suggestionBtn);

    const labelInput = screen.getByLabelText(/nom de l'adresse/i);
    fireEvent.change(labelInput, { target: { value: "Maison" } });

    const submit = screen.getByRole("button", { name: /enregistrer l'adresse/i });
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(submit);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/profile/addresses"),
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(await screen.findByText("Maison")).toBeTruthy();

    // form reset + fermé
    fireEvent.click(screen.getByRole("button", { name: /fermer le formulaire/i }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/rue de la république/i)).toBeNull());
    screen.getByRole("button", { name: /ajouter une adresse/i });
  });

  it("sets an address as default", async () => {
    const initial: SavedAddressTest[] = [
      {
        ...buildUserAddress("addr-1", "Maison"),
        address: buildAddress({ id: "addr-1" }),
        isDefault: false,
      },
      {
        ...buildUserAddress("addr-2", "Bureau"),
        address: buildAddress({ id: "addr-2" }),
        isDefault: false,
      },
    ];
    render(<UserAddressesManager initialAddresses={initial} />);

    const buttons = screen.getAllByRole("button", { name: /par défaut/i });
    fireEvent.click(buttons[1]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/profile/addresses/addr-2"),
        expect.objectContaining({ method: "PATCH" })
      )
    );
    await waitFor(() => expect(screen.getByText(/adresse par défaut/i)).toBeTruthy());
  });

  it("deletes an address after confirmation", async () => {
    const initial: SavedAddressTest[] = [
      {
        ...buildUserAddress("addr-1", "Maison"),
        address: buildAddress({ id: "addr-1" }),
        isDefault: true,
      },
      {
        ...buildUserAddress("addr-2", "Bureau"),
        address: buildAddress({ id: "addr-2" }),
        isDefault: false,
      },
    ];
    render(<UserAddressesManager initialAddresses={initial} />);

    const deleteBtn = screen.getByLabelText(/supprimer bureau/i);
    fireEvent.click(deleteBtn);

    const confirm = await screen.findByRole("button", { name: /^supprimer$/i });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/profile/addresses/addr-2"),
        expect.objectContaining({ method: "DELETE" })
      )
    );
    await waitFor(() => expect(screen.queryByText("Bureau")).toBeNull());
  });
});
