/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { UserAddressesManager } from "@/components/user-addresses-manager";

const sampleSuggestion = {
  label: "114 route de cremieu, France",
  streetNumber: "114",
  street: "route de cremieu",
  postcode: "38230",
  city: "Tignieu-Jameyzieu",
  country: "France",
  lat: 45.73,
  lng: 5.19,
};

describe("UserAddressesManager address selection", () => {
  beforeEach(() => {
    // @ts-expect-error global fetch mock for test
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith("/api/forecast/geocode")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [sampleSuggestion] }),
        }) as unknown as Response;
      }
      return Promise.reject(new Error(`Unhandled fetch ${url}`));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("fills form fields without duplicating street number when selecting a suggestion", async () => {
    render(<UserAddressesManager initialAddresses={[]} />);

    const searchInput = screen.getByPlaceholderText(/rue de la république/i);
    fireEvent.change(searchInput, { target: { value: "114 route de cremieu" } });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));

    const suggestionButton = await waitFor(() =>
      screen.getByRole("button", { name: /114 route de cremieu/i })
    );
    fireEvent.click(suggestionButton);

    const numberInput = screen.getByLabelText(/numéro/i) as HTMLInputElement;
    const streetInput = screen.getByLabelText(/^rue$/i) as HTMLInputElement;
    const postalInput = screen.getByLabelText(/code postal/i) as HTMLInputElement;
    const cityInput = screen.getByLabelText(/ville/i) as HTMLInputElement;

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(numberInput.value).toBe("114");
    expect(streetInput.value).toBe("route de cremieu");
    expect(postalInput.value).toBe("38230");
    expect(cityInput.value).toBe("Tignieu-Jameyzieu");
    expect(numberInput.readOnly).toBe(true);
    expect(streetInput.readOnly).toBe(true);
    expect(postalInput.readOnly).toBe(true);
    expect(cityInput.readOnly).toBe(true);
  });

  it("displays a single normalized suggestion with address line details", async () => {
    render(<UserAddressesManager initialAddresses={[]} />);

    const searchInput = screen.getByPlaceholderText(/rue de la république/i);
    fireEvent.change(searchInput, { target: { value: "114 route de cremieu" } });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));

    const suggestionButton = await waitFor(() =>
      screen.getByRole("button", { name: /114 route de cremieu/i })
    );

    const detail = within(suggestionButton).getByText(/38230/i);
    expect(detail.textContent?.toLowerCase()).not.toContain("114 114");
    const suggestionButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent?.toLowerCase().includes("route de cremieu"));
    expect(suggestionButtons).toHaveLength(1);
  });
});
