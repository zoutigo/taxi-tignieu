/** @jest-environment jsdom */

import { TextEncoder, TextDecoder } from "util";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { FaqManager } from "@/components/dashboard/faq-manager";
jest.mock("@/actions/faq", () => ({
  upsertFaq: jest.fn(),
  deleteFaq: jest.fn(),
}));
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/permissions", () => ({
  getPermissionsForUser: jest.fn(),
  getUserRole: jest.fn(),
}));

(global as { TextEncoder?: unknown }).TextEncoder = TextEncoder;
(global as { TextDecoder?: unknown }).TextDecoder = TextDecoder;
(global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (typeof window !== "undefined") {
  // jsdom stub
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).scrollTo = () => {};
}

// next/cache imports web streams helpers; polyfill minimal encoder/decoder
// prevent next/cache from loading node Fetch APIs that expect complete polyfills
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const categories = [{ id: "cat-1", name: "Général" }];
const faqs = [
  {
    id: "faq-1",
    question: "Question 1",
    answer: "Réponse 1",
    createdAt: new Date().toISOString(),
    category: categories[0],
    isFeatured: false,
    isValidated: true,
  },
];

describe("FAQ manager - permissions", () => {
  it("masque les actions quand aucune permission de création/édition/suppression", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FaqManager
          faqs={faqs}
          categories={categories}
          permissions={{ canCreate: false, canUpdate: false, canDelete: false }}
        />
      );
    });

    expect(container.querySelector("button[aria-label='Nouvelle question']")).toBeNull();
    expect(container.querySelector("button[aria-label='Modifier']")).toBeNull();
    expect(container.querySelector("button[aria-label='Supprimer']")).toBeNull();

    const form = container.querySelector("form");
    const inputs = form ? Array.from(form.querySelectorAll("input, textarea, select")) : [];
    inputs
      .filter((el) => el.getAttribute("type") !== "checkbox")
      .forEach((el) => {
        expect((el as HTMLInputElement).disabled).toBe(true);
      });

    expect(container.textContent).toContain("Lecture seule pour ce module.");

    await act(async () => {
      root.unmount();
    });
  });

  it("affiche la création quand canCreate est activé", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <FaqManager
          faqs={faqs}
          categories={categories}
          permissions={{ canCreate: true, canUpdate: false, canDelete: false }}
        />
      );
    });

    expect(container.querySelector("button[aria-label='Nouvelle question']")).toBeTruthy();
    expect(container.querySelector("button[aria-label='Modifier']")).toBeNull();
    expect(container.querySelector("button[aria-label='Supprimer']")).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
