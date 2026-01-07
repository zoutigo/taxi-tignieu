/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReservationPage from "@/components/reservation-page";
import { useRouter } from "next/navigation";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated", data: null })),
  signIn: jest.fn(),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    ...props
  }: { onCheckedChange?: (v: boolean) => void } & Record<string, unknown>) => (
    <input
      type="checkbox"
      {...props}
      onChange={(e) => onCheckedChange?.((e.target as HTMLInputElement).checked)}
    />
  ),
}));

const pushMock = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: pushMock });

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("Reservation suggestions filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
      }
      if (url.startsWith("/api/tarifs/search")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            results: [
              // same as user input: should be filtered out
              {
                label: "114 route de cremie",
                lat: 45.75,
                lng: 4.85,
              },
              // valid suggestion we expect to keep
              {
                label: "114 route de cremie, France",
                lat: 45.76,
                lng: 4.86,
                city: "Tignieu-Jameyzieu",
                postcode: "38230",
              },
              // duplicate coordinates + label should be deduped
              {
                label: "114 route de cremie, France",
                lat: 45.76,
                lng: 4.86,
                city: "Tignieu-Jameyzieu",
                postcode: "38230",
              },
              // invalid coords should be ignored
              {
                label: "Invalide",
                lat: NaN,
                lng: NaN,
              },
            ],
          }),
        });
      }
      if (url.startsWith("/api/tarifs/geocode")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("n'affiche qu'une suggestion réelle filtrée/dédupliquée", async () => {
    render(<ReservationPage />);

    fireEvent.click(screen.getByRole("button", { name: /commencer la réservation/i }));

    fireEvent.change(screen.getByPlaceholderText("Ex: 114B route de Crémieu, Tignieu"), {
      target: { value: "114 route de cremie" },
    });

    await waitFor(() => {
      const kept = screen.getAllByText("114 route de cremie, France");
      expect(kept.length).toBe(1);
      expect(screen.queryByText("Invalide")).toBeNull();
    });
  });
});
