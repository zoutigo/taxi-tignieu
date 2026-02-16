/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
    faq: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedFaqFindMany = prisma.faq.findMany as unknown as jest.MockedFunction<
  typeof prisma.faq.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("Landing credibility banner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindMany.mockResolvedValue([]);
    mockedFaqFindMany.mockResolvedValue([]);
    mockedGetSiteContact.mockResolvedValue({
      phone: "04 95 78 54 00",
      email: "contact@taxitignieu.fr",
      address: {
        street: "Rue de la République",
        streetNumber: "9",
        postalCode: "38230",
        city: "Tignieu-Jameyzieu",
        country: "France",
      },
    });
  });

  it("affiche le bandeau de crédibilité avec les marqueurs clefs", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(mockedGetSiteContact).toHaveBeenCalled();
    expect(html).toContain("Confiance locale");
    expect(html).toContain("Au service du Nord Isère depuis 2010");
    expect(html).toContain("12 000 trajets réalisés");
    expect(html).toContain("Note moyenne 4.9 / 5");
    expect(html).toContain("Chauffeurs agréés");
    expect(html).toContain("Disponibilité 24/7");
  });
});
