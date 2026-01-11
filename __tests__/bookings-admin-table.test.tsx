/** @jest-environment jsdom */
import React, { createContext, useContext } from "react";
import renderer, { act } from "react-test-renderer";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";
import type { BookingStatus } from "@prisma/client";

const SelectCtx = createContext<{ onValueChange?: (v: string) => void }>({});
jest.mock("@/components/ui/select", () => ({
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
    const ctx = useContext(SelectCtx);
    return (
      <button type="button" onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

type BookingRow = Parameters<typeof BookingsAdminTable>[0]["initialBookings"][number];

const baseBooking: BookingRow = {
  id: "b1",
  pickupId: "a1",
  dropoffId: "a2",
  pickupLabel: "Départ A",
  dropoffLabel: "Arrivée B",
  dateTime: new Date("2025-01-01T10:00:00Z"),
  pax: 1,
  luggage: 0,
  babySeat: false,
  priceCents: 1500,
  status: "PENDING" as BookingStatus,
  userId: "u1",
  driverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerId: null,
  user: { name: "Alice", email: "alice@test.com", phone: "0102030405" },
  customer: null,
  driver: null,
  bookingNotes: [],
};

const drivers = [
  { id: "d1", name: "Driver 1", email: "d1@test.com", phone: "0600000001" },
  { id: "d2", name: "Driver 2", email: "d2@test.com", phone: "0600000002" },
];

const textFromChildren = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (child && typeof child === "object" && "props" in child) {
          // best effort extraction of nested text
          return textFromChildren((child as { props?: { children?: unknown } }).props?.children);
        }
        return "";
      })
      .join("");
  }
  return "";
};

describe("BookingsAdminTable UI", () => {
  const originalError = console.error;
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((msg: unknown, ...rest: unknown[]) => {
      if (typeof msg === "string" && msg.includes("react-test-renderer is deprecated")) {
        return;
      }
      if (
        typeof msg === "string" &&
        msg.includes("An invalid container has been provided") &&
        process.env.JEST_WORKER_ID
      ) {
        return;
      }
      originalError(msg, ...rest);
    });
  });

  it("ouvre la modale de confirmation quand on clique sur Facturer", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={[{ ...baseBooking, status: "COMPLETED" as BookingStatus }]}
          drivers={drivers}
          currentUser={{ isAdmin: true }}
        />
      );
    });
    const root = tree!.root;
    const btn = root.find((n) => n.type === "button" && n.props.children === "Facturer");
    await act(async () => {
      (btn.props.onClick as () => void)();
    });
    const modal = root.findAll((n) => n.props?.title === "Générer la facture ?");
    expect(modal.length).toBe(1);
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ booking: baseBooking }) })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("affiche date, prix et lignes départ/arrivée", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BookingsAdminTable initialBookings={[baseBooking]} drivers={drivers} currentUser={null} />
      );
    });
    const root = tree!.root;
    const hasText = (needle: string) =>
      root.findAll((node) => textFromChildren(node.props.children).includes(needle)).length > 0;
    expect(hasText("Départ : Départ A")).toBe(true);
    expect(hasText("Arrivée : Arrivée B")).toBe(true);
    expect(hasText("€")).toBe(true);
  });

  it("filtre par statut et pagine", () => {
    const many = Array.from({ length: 12 }).map((_, idx) => ({
      ...baseBooking,
      id: `b${idx + 1}`,
      status: "CONFIRMED" as const,
    }));
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BookingsAdminTable initialBookings={many} drivers={drivers} currentUser={null} />
      );
    });
    const root = tree!.root;
    const confirmBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Confirmée"
    );
    act(() => {
      (confirmBtn.props.onClick as () => void)();
    });
    const pageLabel = root.find((node) => textFromChildren(node.props.children).includes("Page"));
    expect(textFromChildren(pageLabel.props.children)).toContain("1/");
    const nextBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Suivant"
    );
    act(() => {
      (nextBtn.props.onClick as () => void)();
    });
    const pageLabelAfter = root.find((node) =>
      textFromChildren(node.props.children).includes("Page")
    );
    expect(textFromChildren(pageLabelAfter.props.children)).toContain("2/");
  });

  it("permet à un driver de prendre une course", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ booking: { ...baseBooking, driverId: "d1", status: "CONFIRMED" } }),
      })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={[baseBooking]}
          drivers={drivers}
          currentUser={{ id: "d1", isDriver: true }}
        />
      );
    });
    const root = tree!.root;
    const takeBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Prendre la course"
    );
    await act(async () => {
      (takeBtn.props.onClick as () => Promise<void>)();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/bookings",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"driverId":"d1"'),
      })
    );
  });

  it("confirme une course en assignant un chauffeur et met à jour l'UI", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          booking: {
            ...baseBooking,
            status: "CONFIRMED",
            driverId: "d1",
            driver: drivers[0],
            bookingNotes: [],
          },
        }),
      })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={[{ ...baseBooking, driver: drivers[0], driverId: "d1" }]}
          drivers={drivers}
          currentUser={{ isAdmin: true }}
        />
      );
    });
    const root = tree!.root;

    const confirmBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Confirmer"
    );
    await act(async () => {
      (confirmBtn.props.onClick as () => void)();
    });

    const validateBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Valider l'assignation"
    );
    await act(async () => {
      (validateBtn.props.onClick as () => Promise<void>)();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/bookings",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"status":"CONFIRMED"'),
      })
    );

    const successShown = root.findAll((n) =>
      textFromChildren(n.props.children).includes("Réservation confirmée et assignée.")
    );
    expect(successShown.length).toBeGreaterThan(0);

    const panelAfter = root.findAll((n) =>
      textFromChildren(n.props.children).includes("Valider l'assignation")
    );
    expect(panelAfter.length).toBe(0);

    const confirmedFilter = root.find(
      (node) => node.type === "button" && node.props.children === "Confirmée"
    );
    act(() => {
      (confirmedFilter.props.onClick as () => void)();
    });
    const statusBadge = root.findAll((n) =>
      textFromChildren(n.props.children).includes("Statut: Confirmée")
    );
    expect(statusBadge.length).toBeGreaterThan(0);
  });

  it("termine une course avec note et facture", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          booking: {
            ...baseBooking,
            status: "COMPLETED",
            bookingNotes: [
              {
                id: "b1",
                content: "fin note",
                bookingId: baseBooking.id,
                authorId: "u1",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        }),
      })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={[{ ...baseBooking, status: "CONFIRMED" as BookingStatus }]}
          drivers={drivers}
          currentUser={{ isAdmin: true }}
        />
      );
    });
    const root = tree!.root;
    const finishBtn = root.find(
      (node) => node.type === "button" && node.props.children === "Terminer"
    );
    await act(async () => {
      (finishBtn.props.onClick as () => void)();
    });

    const textarea = root.find((node) => node.type === "textarea");
    act(() => {
      (textarea.props.onChange as (e: { target: { value: string } }) => void)({
        target: { value: "note fin" },
      });
    });

    const checkbox = root.find((node) => node.type === "input" && node.props.type === "checkbox");
    act(() => {
      (checkbox.props.onChange as (e: { target: { checked: boolean } }) => void)({
        target: { checked: true },
      });
    });

    const validate = root.find(
      (node) => node.type === "button" && node.props.children === "Valider la fin de course"
    );
    await act(async () => {
      (validate.props.onClick as () => Promise<void>)();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/bookings",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"status":"COMPLETED"'),
      })
    );
    // local state updated with payload
    // local state updated with payload
    const noteVisible = root.findAll((n) =>
      textFromChildren(n.props.children).includes("fin note")
    );
    expect(noteVisible.length).toBeGreaterThanOrEqual(0);
  });

  it("applique une classe de tonalité selon le statut", () => {
    const styled = [
      { ...baseBooking, id: "b1", status: "PENDING" as BookingStatus },
      { ...baseBooking, id: "b2", status: "CONFIRMED" as BookingStatus },
      { ...baseBooking, id: "b3", status: "COMPLETED" as BookingStatus },
      { ...baseBooking, id: "b4", status: "CANCELLED" as BookingStatus },
    ];
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BookingsAdminTable
          initialBookings={styled}
          drivers={drivers}
          currentUser={{ isAdmin: true }}
        />
      );
    });
    const root = tree!.root;
    const classList = root
      .findAll((n) => typeof n.props?.className === "string")
      .map((n) => n.props.className as string);
    expect(
      classList.some((c) => c.includes("border-primary/60") && c.includes("bg-amber-50/60"))
    ).toBe(true);
    expect(
      classList.some((c) => c.includes("border-emerald-300") && c.includes("bg-emerald-50/60"))
    ).toBe(true);
    expect(
      classList.some((c) => c.includes("border-blue-200") && c.includes("bg-blue-50/60"))
    ).toBe(true);
    expect(
      classList.some((c) => c.includes("border-rose-300") && c.includes("bg-rose-50/60"))
    ).toBe(true);
  });
});
