/**
 * @jest-environment node
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "@/components/site-footer";
import { getSiteContact } from "@/lib/site-config";

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

const mockedContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;

describe("SiteFooter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche un lien Services vers /services dans la navigation", async () => {
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

    const html = renderToStaticMarkup(await SiteFooter());
    expect(html).toContain('href="/services"');
    expect(html).toContain(">Services<");
  });
});
