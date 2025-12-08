/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import ServiceDetailPage, { generateStaticParams } from "@/app/services/[slug]/page";
import { getSiteContact } from "@/lib/site-config";
import { serviceGroups } from "@/app/services/data";

jest.mock("@/app/services/data", () => {
  const actual = jest.requireActual("@/app/services/data");
  return {
    ...actual,
    getServiceGroups: jest.fn(async () => actual.serviceGroups),
  };
});

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

const mockedContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("Service detail pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it("génère les bons slugs pour le SSG", async () => {
    const params = await generateStaticParams();
    const slugs = params.map((p) => p.slug);
    expect(slugs).toEqual(serviceGroups.map((g) => g.slug));
  });

  it("rend le détail Particuliers avec ses prestations et liens CTA", async () => {
    const html = renderToStaticMarkup(
      await ServiceDetailPage({ params: { slug: "particuliers" } })
    );

    expect(html).toContain("Particuliers");
    expect(html).toContain("Trajets classiques");
    expect(html).toContain("Aéroport / Gare");
    expect(html).toContain("Longue distance");
    expect(html).toContain('href="/reserver"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/services"');
    expect(html).toContain('href="tel:0123456789"');
  });
});
