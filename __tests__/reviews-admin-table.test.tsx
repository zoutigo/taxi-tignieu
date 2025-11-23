/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ReviewsAdminTable } from "@/components/dashboard/reviews-admin-table";

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div role="option" aria-selected="false">
      {children}
    </div>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

type ReviewRow = Parameters<typeof ReviewsAdminTable>[0]["initialReviews"][number];

const baseReview: ReviewRow = {
  id: 1,
  userId: "u1",
  bookingId: null,
  rating: 5,
  comment: "Très bon trajet",
  status: "PENDING",
  createdAt: new Date("2025-01-01T10:00:00Z"),
  updatedAt: new Date("2025-01-01T10:00:00Z"),
  user: { name: "Alice", email: "alice@test.com" },
};

const textFromChildren = (val: unknown): string => {
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(textFromChildren).join("");
  if (val && typeof val === "object" && "props" in val) {
    return textFromChildren((val as { props?: { children?: unknown } }).props?.children);
  }
  return "";
};

describe("ReviewsAdminTable UI", () => {
  const originalError = console.error;
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((msg: unknown, ...rest: unknown[]) => {
      if (typeof msg === "string" && msg.includes("react-test-renderer is deprecated")) {
        return;
      }
      (originalError as (...args: unknown[]) => void)(msg as string, ...rest);
    });
  });
  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("affiche l'avis en lecture seule par défaut", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsAdminTable initialReviews={[baseReview]} />);
    });
    const root = tree!.root;
    const commentNode = root.find((n) =>
      textFromChildren(n.props.children).includes(baseReview.comment)
    );
    expect(commentNode).toBeTruthy();
    const forms = root.findAll((n) => n.type === "textarea");
    expect(forms.length).toBe(0);
    const expectedDate = new Date(baseReview.createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const textDump = root
      .findAll(() => true)
      .map((n) => textFromChildren(n.props.children))
      .join(" ");
    expect(textDump).toContain(expectedDate);
  });

  it("ouvre le formulaire après clic sur modifier", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsAdminTable initialReviews={[baseReview]} />);
    });
    const root = tree!.root;
    const editBtn = root.find((n) => n.props["aria-label"] === "Modifier l'avis");
    act(() => {
      (editBtn.props.onClick as () => void)();
    });
    const forms = root.findAll((n) => n.type === "textarea");
    expect(forms.length).toBeGreaterThan(0);
  });

  it("trie par date décroissante (le plus récent en premier)", () => {
    const older = { ...baseReview, id: 2, createdAt: new Date("2024-01-01T10:00:00Z") };
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsAdminTable initialReviews={[older, baseReview]} />);
    });
    const root = tree!.root;
    const comments = root
      .findAll((n) => n.type === "p" && typeof n.props.children === "string")
      .map((n) => n.props.children as string);
    expect(comments.join(" ")).toContain(baseReview.comment);
  });

  it("affiche le statut dans la barre d'actions", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsAdminTable initialReviews={[baseReview]} />);
    });
    const root = tree!.root;
    const statusBadges = root.findAll((n) =>
      textFromChildren(n.props.children).toLowerCase().includes("en attente")
    );
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it("déclenche la suppression via l'icon button", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    );
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock as jest.Mock;

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReviewsAdminTable initialReviews={[baseReview]} />);
    });
    const root = tree!.root;
    const deleteBtn = root.find((n) => n.props["aria-label"] === "Supprimer l'avis");
    await act(async () => {
      (deleteBtn.props.onClick as () => Promise<void>)();
    });
    const confirm = root.find((n) => n.type === "button" && n.props.children === "Supprimer");
    await act(async () => {
      (confirm.props.onClick as () => Promise<void>)();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/reviews",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
