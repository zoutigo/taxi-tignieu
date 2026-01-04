/**
 * @jest-environment node
 */
import { renderToReadableStream } from "react-dom/server";
import PrivacyPolicyPage, { generateMetadata } from "@/app/politique-de-confidentialite/page";

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(async () => ({
    name: "Taxi Test",
    ownerName: "John Doe",
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

describe("Page politique de confidentialité", () => {
  it("rend la page avec les coordonnées et sections", async () => {
    const element = await PrivacyPolicyPage();
    const html = await streamToString(await renderToReadableStream(element));
    expect(html).toContain("Politique de confidentialité");
    expect(html).toContain("Taxi Test");
    expect(html).toContain("John Doe");
    expect(html).toContain("test@example.com");
    expect(html).toContain("01 23 45 67 89");
    expect(html).toContain("Responsable du traitement des données");
    expect(html).toContain("Données personnelles collectées");
  });

  it("génère les metadatas dynamiques", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toContain("Taxi Test");
    expect(metadata.description).toMatch(/données personnelles/i);
  });
});
