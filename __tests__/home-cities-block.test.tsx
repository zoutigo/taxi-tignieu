/**
 * @jest-environment node
 */
import { renderToReadableStream } from "react-dom/server";
import type { ImageProps, StaticImageData } from "next/image";
import Home from "@/app/page";
import { cities } from "@/app/cities/city-data";

const streamToString = async (stream: ReadableStream): Promise<string> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }

  return result;
};

jest.mock("@/lib/prisma", () => {
  const mockFindMany = jest.fn().mockResolvedValue([]);
  return {
    prisma: {
      review: { findMany: mockFindMany },
    },
  };
});

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(async () => ({
    phone: "01 23 45 67 89",
    email: "contact@test.fr",
    address: {
      street: "Rue de la Paix",
      streetNumber: "10",
      postalCode: "75000",
      city: "Paris",
      country: "France",
    },
  })),
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

describe("Landing page - villes couvertes", () => {
  it("affiche les liens vers chaque ville", async () => {
    const html = await streamToString(await renderToReadableStream(await Home()));
    cities.forEach((city) => {
      expect(html).toContain(`href="/${city.slug}"`);
      expect(html).toContain(city.name);
    });
  });
});
