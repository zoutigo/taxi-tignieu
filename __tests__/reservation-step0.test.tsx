/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReservationPage from "@/components/reservation-page";
import { ReservationWizard } from "@/components/reservation-wizard";
import { useRouter } from "next/navigation";
import { defaultTariffConfig } from "@/lib/tarifs";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated", data: null })),
  signIn: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

jest.mock("@/components/reservation-page", () => ({
  __esModule: true,
  default: () => (
    <ReservationWizard
      mode="create"
      successRedirect="/espace-client/bookings"
      useStore
      savedAddresses={[]}
    />
  ),
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

describe("ReservationPage step 0 UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/tarifs/config")) {
        return Promise.resolve({ ok: true, json: async () => defaultTariffConfig });
      }
      return Promise.resolve({ ok: true, json: async () => ({ results: [] }) });
    });
  });

  it("affiche le hero, le bouton CTA et les conseils en étape 0 uniquement", () => {
    render(<ReservationPage />);

    expect(screen.getByText("Réservez votre trajet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /commencer la réservation/i })).toBeTruthy();
    expect(screen.getByText(/Conseils/)).toBeTruthy();
    expect(screen.queryByPlaceholderText("Ex: 114B route de Crémieu, Tignieu")).toBeNull();
  });

  it("passe à l'étape 1 après clic sur le bouton CTA", async () => {
    render(<ReservationPage />);

    fireEvent.click(screen.getByRole("button", { name: /commencer la réservation/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ex: 114B route de Crémieu, Tignieu")).toBeTruthy();
    });
  });
});
