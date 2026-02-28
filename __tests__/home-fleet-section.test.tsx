/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ImageProps, StaticImageData } from "next/image";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
import {
  getPublicFeaturedTypeTrips,
  getPublicFeaturedZoneTrips,
} from "@/lib/featured-trips-public";

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

jest.mock("@/lib/featured-trips-public", () => ({
  getPublicFeaturedTypeTrips: jest.fn(),
  getPublicFeaturedZoneTrips: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, fill, priority, ...rest }: ImageProps) => {
    const stringSrc = typeof src === "string" ? src : (src as StaticImageData).src;
    return (
      <span
        data-testid="mock-image"
        data-src={stringSrc}
        data-alt={alt ?? ""}
        data-fill={fill ? "true" : "false"}
        data-priority={priority ? "true" : "false"}
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
      />
    );
  },
}));

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;
const mockedFaqFindMany = prisma.faq.findMany as unknown as jest.MockedFunction<
  typeof prisma.faq.findMany
>;
const mockedGetSiteContact = getSiteContact as jest.MockedFunction<typeof getSiteContact>;
const mockedGetPublicFeaturedTypeTrips = getPublicFeaturedTypeTrips as jest.MockedFunction<
  typeof getPublicFeaturedTypeTrips
>;
const mockedGetPublicFeaturedZoneTrips = getPublicFeaturedZoneTrips as jest.MockedFunction<
  typeof getPublicFeaturedZoneTrips
>;

describe("Landing page - bloc Notre flotte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindMany.mockResolvedValue([]);
    mockedFaqFindMany.mockResolvedValue([]);
    mockedGetPublicFeaturedTypeTrips.mockResolvedValue([]);
    mockedGetPublicFeaturedZoneTrips.mockResolvedValue([]);
    mockedGetSiteContact.mockResolvedValue({
      phone: "04 95 78 54 00",
      email: "contact@test.fr",
      address: {
        street: "Rue de la Republique",
        streetNumber: "9",
        postalCode: "38230",
        city: "Tignieu-Jameyzieu",
        country: "France",
      },
    });
  });

  it("affiche l'image de flotte et le bloc Notre flotte", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Notre flotte");
    expect(html).toContain('data-src="/images/three-cars-mini.png"');
  });
});
