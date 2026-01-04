/**
 * @jest-environment node
 */
import { renderToReadableStream } from "react-dom/server";
import type { ImageProps, StaticImageData } from "next/image";
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
  default: ({ src, alt, fill: _fill, priority: _priority, ...rest }: ImageProps) => {
    const stringSrc = typeof src === "string" ? src : (src as StaticImageData).src;
    return (
      <span
        data-testid="mock-image"
        data-src={stringSrc}
        data-alt={alt ?? ""}
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
      />
    );
  },
}));

describe("City pages", () => {
  it("rend chaque page ville avec son titre et ses liens CTA", async () => {
    const pages = [
      { slug: "tignieu", mod: () => import("@/app/tignieu/page") },
      { slug: "charvieu-chavagneux", mod: () => import("@/app/charvieu-chavagneux/page") },
      { slug: "pont-de-cheruy", mod: () => import("@/app/pont-de-cheruy/page") },
      { slug: "cremieu", mod: () => import("@/app/cremieu/page") },
      { slug: "meyzieu", mod: () => import("@/app/meyzieu/page") },
      { slug: "pusignan", mod: () => import("@/app/pusignan/page") },
      { slug: "chavanoz", mod: () => import("@/app/chavanoz/page") },
      { slug: "janneyrias", mod: () => import("@/app/janneyrias/page") },
    ];

    for (const page of pages) {
      const city = cities.find((c) => c.slug === page.slug);
      const mod = await page.mod();
      const element = await mod.default();
      const html = await streamToString(await renderToReadableStream(element));
      expect(html).toContain(city?.heroTitle ?? city?.name ?? page.slug);
      expect(html).toContain('href="/reserver"');
    }
  });
});
