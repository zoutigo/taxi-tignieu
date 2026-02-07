/**
 * @jest-environment node
 */
import { renderToReadableStream } from "react-dom/server";
import type { ImageProps, StaticImageData } from "next/image";
import { cities } from "@/lib/data/cities";

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

jest.mock("@/app/services/data", () => ({
  getServiceGroups: jest.fn(async () => [
    {
      slug: "particuliers",
      title: "Particuliers",
      summary: "Résumé",
      items: [
        { title: "Trajets classiques", description: "Desc", highlights: ["A", "B"] },
        { title: "Aéroport", description: "Desc 2", highlights: ["C"] },
      ],
    },
  ]),
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

describe("City pages", () => {
  it("rend chaque page ville avec son titre et ses liens CTA", async () => {
    global.fetch = jest
      .fn(async () => ({ ok: true, json: async () => ({ trips: [] }) }) as Response)
      .mockName("fetchMock");
    for (const city of cities) {
      const { CityPage } = await import("@/components/cities/city-page");
      const element = await CityPage({ city });
      const html = await streamToString(await renderToReadableStream(element));
      expect(html).toContain(city?.heroTitle ?? city?.name ?? city.slug);
      expect(html).toContain('href="/reserver"');
    }
  });
});
