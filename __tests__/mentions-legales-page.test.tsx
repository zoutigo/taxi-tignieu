/**
 * @jest-environment node
 */
import { renderToReadableStream } from "react-dom/server";
import MentionsLegalesPage, { generateMetadata } from "@/app/mentions-legales/page";

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(async () => ({
    name: "Taxi Test",
    ownerName: "John Doe",
    siret: "123 456 789 00012",
    ape: "4932Z",
    phone: "01 23 45 67 89",
    email: "test@example.com",
    address: {
      street: "Rue test",
      streetNumber: "12",
      postalCode: "75000",
      city: "Paris",
      country: "France",
    },
  })),
}));

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

describe("Page mentions légales", () => {
  it("rend la page avec les coordonnées et sections", async () => {
    const element = await MentionsLegalesPage();
    const html = await streamToString(await renderToReadableStream(element));
    expect(html).toContain("Mentions légales");
    expect(html).toContain("Taxi Test");
    expect(html).toContain("John Doe");
    expect(html).toContain("123 456 789 00012");
    expect(html).toContain("4932Z");
    expect(html).toContain("test@example.com");
    expect(html).toContain("01 23 45 67 89");
    expect(html).toContain("LCEN");
    expect(html).toContain("Éditeur du site");
    expect(html).toContain("Hébergement du site");
  });

  it("génère les metadatas dynamiques", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toContain("Taxi Test");
    expect(metadata.description).toMatch(/Mentions légales/i);
  });
});
