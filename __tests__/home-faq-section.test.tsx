/**
 * @jest-environment jsdom
 */
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
import { FAQ_ITEMS } from "@/lib/data/seed-static-data";
import { fireClick } from "@/tests/fire-event";
import { TextDecoder, TextEncoder } from "util";

if (typeof (global as { MessageChannel?: unknown }).MessageChannel === "undefined") {
  class FakePort {
    close() {}
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    start() {}
  }
  class FakeMessageChannel {
    port1 = new FakePort();
    port2 = new FakePort();
  }
  (global as { MessageChannel?: unknown }).MessageChannel =
    FakeMessageChannel as unknown as typeof MessageChannel;
}
if (typeof (global as { TextEncoder?: unknown }).TextEncoder === "undefined") {
  (global as { TextEncoder?: unknown }).TextEncoder = TextEncoder as unknown as typeof TextEncoder;
}
if (typeof (global as { TextDecoder?: unknown }).TextDecoder === "undefined") {
  (global as { TextDecoder?: unknown }).TextDecoder = TextDecoder as unknown as typeof TextDecoder;
}

let renderToStaticMarkup: typeof import("react-dom/server").renderToStaticMarkup;
beforeAll(async () => {
  ({ renderToStaticMarkup } = await import("react-dom/server"));
});

jest.mock("@/lib/prisma", () => {
  const reviewFindMany = jest.fn();
  const faqFindMany = jest.fn();
  return {
    prisma: {
      review: { findMany: reviewFindMany },
      faq: { findMany: faqFindMany },
    },
  };
});

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  // strip non-DOM props to avoid React warnings in tests
  default: ({ src, alt, ...rest }: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : (src as { src: string }).src} alt={alt} {...rest} />
  ),
}));

const mockedReviewFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedFaqFindMany = prisma.faq.findMany as unknown as jest.MockedFunction<
  typeof prisma.faq.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("Landing page - FAQ section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReviewFindMany.mockResolvedValue([]);
    mockedFaqFindMany.mockResolvedValue([]);
    mockedGetSiteContact.mockResolvedValue({
      phone: "01 23 45 67 89",
      email: "contact@test.fr",
      address: {
        street: "Rue de la Paix",
        streetNumber: "10",
        postalCode: "75000",
        city: "Paris",
        country: "France",
      },
    });
  });

  it("affiche une question validée par catégorie quand la base renvoie des FAQs en vedette", async () => {
    mockedFaqFindMany.mockResolvedValue([
      {
        id: "faq-1",
        question: "Question en vedette",
        answer: "Réponse prioritaire",
        isFeatured: true,
        isValidated: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
        categoryId: "cat-1",
        category: { name: "Services", order: 1 },
      },
      {
        id: "faq-2",
        question: "Question doublon catégorie",
        answer: "Réponse ignorée car doublon",
        isFeatured: true,
        isValidated: true,
        createdAt: new Date("2025-01-03"),
        updatedAt: new Date("2025-01-04"),
        categoryId: "cat-1",
        category: { name: "Services", order: 1 },
      },
      {
        id: "faq-3",
        question: "Question trajectoires",
        answer: "Réponse trajets",
        isFeatured: true,
        isValidated: true,
        createdAt: new Date("2025-01-05"),
        updatedAt: new Date("2025-01-06"),
        categoryId: "cat-2",
        category: { name: "Tarifs", order: 2 },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.faq.findMany>>);

    const html = renderToStaticMarkup(await Home());

    expect(mockedFaqFindMany).toHaveBeenCalled();
    expect(html).toContain("Question en vedette");
    expect(html).toContain("Question trajectoires");
    expect(html).not.toContain("Question doublon catégorie");
    expect(html).toContain("Services");
    expect(html).toContain("Tarifs");
  });

  it("bascule sur le fallback issu des données seed si aucune FAQ vedette validée", async () => {
    mockedFaqFindMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Home());

    const firstCategory = Object.keys(FAQ_ITEMS)[0] as keyof typeof FAQ_ITEMS;
    const firstQuestion = FAQ_ITEMS[firstCategory][0]?.question;
    expect(html).toContain(firstQuestion);
    const encodedCategory = firstCategory.replace(/&/g, "&amp;");
    expect(html).toContain(encodedCategory);
    expect(html).toContain("Questions fréquentes");
  });

  it("redirige vers la page contact via le bouton poser une question", async () => {
    mockedFaqFindMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Home());
    const container = document.createElement("div");
    container.innerHTML = html;
    const cta = container.querySelector("a[href='/contact']");
    expect(cta).toBeTruthy();
    if (!cta) return;
    const clickSpy = jest.fn();
    cta.addEventListener("click", clickSpy);
    fireClick(cta);
    expect(clickSpy).toHaveBeenCalled();
  });
});
