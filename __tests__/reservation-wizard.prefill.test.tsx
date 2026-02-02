/** @jest-environment jsdom */
import React, { createContext, useContext } from "react";
import { render, screen } from "@testing-library/react";
import { ReservationWizard, type SavedAddressOption } from "@/components/reservation-wizard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "authenticated", data: null })),
  signIn: jest.fn(),
}));

const SelectCtx = createContext<{ onValueChange?: (v: string) => void }>({});
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const ctx = useContext(SelectCtx);
    return (
      <button data-value={value} onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
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

jest.mock("@/components/address-autocomplete", () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      data-testid={placeholder ?? "autocomplete"}
    />
  ),
}));

const pushMock = jest.fn();
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as AppRouterInstance);

const savedAddresses: SavedAddressOption[] = [
  {
    id: "addr-1",
    label: "Maison",
    addressLine: "10 Rue de Paris 75000 Paris France",
    address: {
      label: "10 Rue de Paris 75000 Paris France",
      street: "Rue de Paris",
      streetNumber: "10",
      postcode: "75000",
      city: "Paris",
      country: "France",
      lat: 1,
      lng: 2,
    },
    isDefault: true,
  },
];

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReservationWizard prefill in edit mode", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    (useSession as jest.Mock).mockReturnValue({ status: "authenticated", data: null });
  });

  it("pré-remplit les champs pickup/dropoff en mode edit même avec des adresses sauvegardées", async () => {
    render(
      <ReservationWizard
        mode="edit"
        bookingId="booking-123"
        useStore={false}
        initialValues={{
          pickup: {
            label: "114 route de Crémieu",
            lat: 1,
            lng: 2,
            city: "Crémieu",
            postcode: "38230",
            country: "France",
          },
          dropoff: {
            label: "Place Bellecour Lyon",
            lat: 3,
            lng: 4,
            city: "Lyon",
            postcode: "69002",
            country: "France",
          },
          date: "2025-12-01",
          time: "10:00",
          passengers: 2,
          luggage: 1,
          policiesAccepted: true,
        }}
        savedAddresses={savedAddresses}
      />
    );

    expect(screen.getByText(/114 route de Crémieu/i)).toBeTruthy();
    expect(screen.getByText(/Tignieu/i)).toBeTruthy();
  });
});
