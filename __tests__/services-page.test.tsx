/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import ServicesPage from "@/app/services/page";
import { getSiteContact } from "@/lib/site-config";
jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    sCategory: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockedContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("ServicesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche toutes les catégories et services prévus", async () => {
    mockedContact.mockResolvedValue({
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

    const html = renderToStaticMarkup(await ServicesPage());

    ["Particuliers", "Professionnels", "Spécialisés", "Premium", "Bonus"].forEach((title) => {
      expect(html).toContain(title);
    });

    [
      "Trajets classiques",
      "Aéroport / Gare",
      "Longue distance",
      "Entreprises",
      "Séminaires",
      "Hôtels",
      "Scolaire",
      "Accompagnement seniors",
      "CPAM",
      "Assistance bagages",
      "Van / Groupes",
      "Événementiel",
      "Stations de ski",
      "Transport express",
      "Tourisme",
    ].forEach((service) => {
      expect(html).toContain(service);
    });

    expect(html).toContain('href="/reserver"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="tel:0123456789"');
    ["particuliers", "professionnels", "specialises", "premium", "bonus"].forEach((slug) => {
      expect(html).toContain(`href="/services/${slug}"`);
    });
  });
});
