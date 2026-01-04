/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import FaqPage from "@/app/faq/page";
import { prisma } from "@/lib/prisma";
import { FAQ_ITEMS } from "@/lib/data/seed-static-data";

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

describe("Page FAQ publique", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche uniquement les FAQs validées groupées par catégorie", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "cat-1",
        name: "Tarifs",
        order: 1,
        faqs: [
          {
            id: "f1",
            question: "Quel tarif ?",
            answer: "Tarif réglementé",
            isValidated: true,
            isFeatured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            categoryId: "cat-1",
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.faqCategory.findMany>>);

    const html = renderToStaticMarkup(await FaqPage());
    expect(mockedFindMany).toHaveBeenCalled();
    expect(html).toContain("Tarifs");
    expect(html).toContain("Quel tarif ?");
    expect(html).toContain("Tarif réglementé");
  });

  it("bascule sur le fallback seed si aucune FAQ validée n'est disponible", async () => {
    mockedFindMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await FaqPage());

    const firstCategory = Object.keys(FAQ_ITEMS)[0] as keyof typeof FAQ_ITEMS;
    const firstQuestion = FAQ_ITEMS[firstCategory][0]?.question;
    expect(html).toContain(firstQuestion);
    expect(html).toContain(firstCategory.replace(/&/g, "&amp;"));
  });
});
