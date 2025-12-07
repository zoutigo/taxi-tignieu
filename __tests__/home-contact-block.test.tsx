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
  },
}));

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("Landing contact block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindMany.mockResolvedValue([]);
  });

  it("affiche les coordonnées depuis la configuration du site", async () => {
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

    const html = renderToStaticMarkup(await Home());

    expect(mockedGetSiteContact).toHaveBeenCalled();
    expect(html).toContain("01 23 45 67 89");
    expect(html).toContain("contact@test.fr");
    expect(html).toContain("10 Rue de la Paix, 75000 Paris");
  });
});
