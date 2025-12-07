/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import ContactPage from "@/app/contact/page";
import { getSiteContact } from "@/lib/site-config";

jest.mock("@/components/contact-form", () => ({
  ContactForm: () => <div data-testid="contact-form">FORM</div>,
}));

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

const mockedContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("ContactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche les coordonnées issues du siteConfig et le formulaire", async () => {
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

    const html = renderToStaticMarkup(await ContactPage());
    expect(html).toContain("01 23 45 67 89");
    expect(html).toContain("contact@test.fr");
    expect(html).toContain("Rue de la Paix");
    expect(html).toContain("Formulaire de contact");
    expect(html).toContain("contact-form");
  });
});
