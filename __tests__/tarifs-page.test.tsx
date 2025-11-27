/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import TarifsPage from "@/app/tarifs/page";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const pushMock = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: pushMock });

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("TarifsPage UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("affiche les suggestions et déclenche une réservation après estimation", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/tarifs/search")) {
        return Promise.resolve({
          json: async () => ({
            results: [
              { label: "Gare Part-Dieu", city: "Lyon", postcode: "69003", lat: 45.76, lng: 4.85 },
            ],
          }),
        });
      }
      if (url.startsWith("/api/tarifs/geocode")) {
        return Promise.resolve({ ok: true, json: async () => ({ lat: 45.76, lng: 4.85 }) });
      }
      if (url.startsWith("/api/tarifs/quote")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ distanceKm: 10, durationMinutes: 15, price: 25 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<TarifsPage />);
    });
    const root = tree!.root;

    const arrivalInput = root.find(
      (n) =>
        n.type === "input" &&
        typeof n.props.placeholder === "string" &&
        n.props.placeholder.includes("Aéroport de Lyon")
    );
    await act(async () => {
      (arrivalInput.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "gare pardieu" },
      });
    });

    const suggestionBtn = root.find((n) => {
      if (n.type !== "button" || !Array.isArray(n.props.children)) return false;
      return n.props.children.some((child: unknown) => {
        return (
          typeof child === "object" &&
          child !== null &&
          "props" in (child as { props?: { children?: unknown } }) &&
          (child as { props?: { children?: unknown } }).props?.children === "Gare Part-Dieu"
        );
      });
    });
    await act(async () => {
      (suggestionBtn.props.onClick as () => void)();
    });

    const cityField = root.find(
      (n) => n.type === "input" && Boolean(n.props.readOnly) && n.props.value === "Lyon"
    );
    expect(cityField).toBeTruthy();

    const submitBtn = root.find(
      (n) => n.type === "button" && n.props.children === "Calculer le tarif"
    );
    await act(async () => {
      (submitBtn.props.onClick as () => void)();
    });

    const reserveBtn = root.find(
      (n) => n.type === "button" && n.props.children === "Réserver ce trajet"
    );
    await act(async () => {
      (reserveBtn.props.onClick as () => void)();
    });

    expect(pushMock).toHaveBeenCalled();
  });
});
