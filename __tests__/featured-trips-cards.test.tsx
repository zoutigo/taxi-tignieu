/** @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, back: jest.fn() }),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onConfirm, onCancel }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button onClick={onCancel}>Annuler</button>
        <button onClick={onConfirm}>Supprimer</button>
      </div>
    ) : null,
}));

const trips = [
  {
    id: "t1",
    title: "Trip One",
    summary: "Summary One",
    featuredSlot: "TYPE",
    poiDestinations: [
      {
        id: "p1",
        label: "POI One",
        distanceKm: 7.5,
        durationMinutes: 11,
        priceCents: 1000,
        order: 0,
      },
    ],
  },
  {
    id: "t2",
    title: "Trip Two",
    summary: "Summary Two",
    featuredSlot: "ZONE",
    poiDestinations: [
      {
        id: "p2",
        label: "POI Two",
        distanceKm: 12,
        durationMinutes: 20,
        priceCents: 2500,
        order: 0,
      },
    ],
  },
];

const getToggleForTitle = (title: string) => {
  const el = screen.getByText(title);
  let node: HTMLElement | null = el as HTMLElement | null;
  while (node && node.getAttribute("role") !== "button") {
    node = node.parentElement;
  }
  if (!node) throw new Error("toggle not found");
  return node;
};

describe("FeaturedTripsAdmin cards", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("affiche titre, summary, featuredSlot, boutons, et toggle les POI", () => {
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);

    const card1Toggle = getToggleForTitle("Trip One");
    const card1 = card1Toggle.parentElement as HTMLElement;
    expect(within(card1).getByText("Summary One")).toBeTruthy();
    expect(within(card1).getByText("TYPE")).toBeTruthy();
    expect(within(card1).getAllByRole("button").length).toBeGreaterThanOrEqual(3);

    fireEvent.click(card1Toggle);
    expect(screen.getByText(/POI One/i)).toBeTruthy();
    expect(screen.getByText(/Distance: 7.5/)).toBeTruthy();
    expect(screen.getByText(/Durée: 11/)).toBeTruthy();
    expect(screen.getByText(/Prix: 10\.00 €/)).toBeTruthy();

    fireEvent.click(card1Toggle);
    expect(screen.queryByText(/POI One/i)).toBeNull();

    const card2Toggle = getToggleForTitle("Trip Two");
    fireEvent.click(card2Toggle);
    expect(screen.getByText(/POI Two/i)).toBeTruthy();
    expect(screen.queryByText(/POI One/i)).toBeNull();
  });

  it("affiche la pagination et navigue entre les pages", () => {
    const longList = Array.from({ length: 15 }).map((_, idx) => ({
      id: `t-${idx}`,
      title: `Trip ${idx}`,
      summary: `Summary ${idx}`,
      featuredSlot: idx % 2 === 0 ? "TYPE" : "ZONE",
      poiDestinations: [],
    }));
    render(<FeaturedTripsAdmin initialTrips={longList as any} showForm={false} />);

    // pagination info
    expect(screen.getByText(/Page 1/)).toBeTruthy();
    // bouton suivant
    const buttons = screen.getAllByRole("button");
    const next = buttons.find((b) => b.querySelector("svg.lucide-chevron-right"));
    if (!next) throw new Error("next button not found");
    fireEvent.click(next);
    expect(screen.getByText(/Page 2/)).toBeTruthy();
  });

  it("le bouton Voir (œil) ouvre et ferme la fiche du trajet", () => {
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);
    const cardToggle = getToggleForTitle("Trip Two");
    const eyeBtn = within(cardToggle.parentElement as HTMLElement)
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").includes("lucide-eye"));
    if (!eyeBtn) throw new Error("eye icon button not found");
    fireEvent.click(eyeBtn);
    expect(screen.getByText(/POI Two/)).toBeTruthy();
    fireEvent.click(eyeBtn);
    expect(screen.queryByText(/POI Two/)).toBeNull();
  });

  it("le bouton Modifier redirige vers la page d’édition", () => {
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);
    const card = screen.getByText("Trip One").closest("div.rounded-xl") as HTMLElement;
    const editBtn = within(card)
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").includes("lucide-pencil"));
    if (!editBtn) throw new Error("edit button not found");
    fireEvent.click(editBtn);
    expect(pushMock).toHaveBeenCalledWith("/dashboard/featured-trips/t1/edit");
  });

  it("gère le workflow de suppression avec ConfirmDialog et AppMessage", async () => {
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);

    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    (global.fetch as unknown) = mockFetch as any;

    const card = screen.getByText("Trip One").closest("div.rounded-xl") as HTMLElement;
    const deleteBtn = within(card)
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").toLowerCase().includes("trash"));
    if (!deleteBtn) throw new Error("delete button not found");
    fireEvent.click(deleteBtn);
    const dialog = await screen.findByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByText(/supprimer/i));
    await screen.findByText(/supprimé/i);
    expect(screen.getByText(/supprimé/i)).toBeTruthy();

    const closeMsg = screen
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").includes("lucide-x"));
    if (closeMsg) fireEvent.click(closeMsg);
    expect(screen.queryByText(/supprimé/i)).toBeNull();

    expect(mockFetch).toHaveBeenCalled();
  });

  it("ferme le confirm dialog si on annule", () => {
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);
    const card = screen.getByText("Trip One").closest("div.rounded-xl") as HTMLElement;
    const deleteBtn = within(card)
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").toLowerCase().includes("trash"));
    if (!deleteBtn) throw new Error("delete button not found");
    fireEvent.click(deleteBtn);
    const dialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByText(/annuler/i));
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });

  it("affiche une erreur si l'API de suppression échoue", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ error: "ko" }) });
    (global.fetch as unknown) = mockFetch as any;
    render(<FeaturedTripsAdmin initialTrips={trips as any} showForm={false} />);

    const card = screen.getByText("Trip One").closest("div.rounded-xl") as HTMLElement;
    const deleteBtn = within(card)
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").toLowerCase().includes("trash"));
    if (!deleteBtn) throw new Error("delete button not found");
    fireEvent.click(deleteBtn);
    const dialog = await screen.findByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByText(/supprimer/i));

    await screen.findByText(/Suppression impossible|Erreur réseau|ko/i);
    expect(mockFetch).toHaveBeenCalled();

    const closeMsg = screen
      .getAllByRole("button")
      .find((b) => (b.innerHTML ?? "").includes("lucide-x"));
    if (closeMsg) fireEvent.click(closeMsg);
    expect(screen.queryByText(/Suppression impossible|Erreur réseau|ko/i)).toBeNull();
  });
});
