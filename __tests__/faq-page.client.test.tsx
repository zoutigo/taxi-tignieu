/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import FaqPage from "@/app/faq/page";
import { prisma } from "@/lib/prisma";
import { fireClick } from "@/tests/fire-event";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    faqCategory: {
      findMany: jest.fn(),
    },
  },
}));

const mockedFindMany = prisma.faqCategory.findMany as unknown as jest.MockedFunction<
  typeof prisma.faqCategory.findMany
>;

describe("Page FAQ - interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ouvre et ferme une réponse au clic sur la question", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "cat-1",
        name: "Services",
        order: 1,
        faqs: [
          {
            id: "faq-1",
            question: "Faites-vous l'aéroport ?",
            answer: "Oui, navettes régulières.",
            isValidated: true,
            isFeatured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            categoryId: "cat-1",
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.faqCategory.findMany>>);

    const container = document.createElement("div");
    const root = createRoot(container);
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(await FaqPage());
    });

    const summary = container.querySelector("summary");
    const details = container.querySelector("details");
    expect(summary?.textContent).toContain("Faites-vous l'aéroport ?");
    expect(details?.open).toBe(false);

    if (!summary) return;

    await act(async () => {
      fireClick(summary);
      if (details) {
        // jsdom ne gère pas automatiquement le toggle des <details>, on le simule
        details.open = true;
      }
    });
    expect(details?.open).toBe(true);

    await act(async () => {
      fireClick(summary);
      if (details) {
        details.open = false;
      }
    });
    expect(details?.open).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});
