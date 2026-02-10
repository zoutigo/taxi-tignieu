/** @jest-environment jsdom */
import React from "react";
import { TextDecoder, TextEncoder } from "util";

jest.mock("@/lib/site-config", () => ({
  getSiteContact: jest.fn(async () => ({
    phone: "01 23 45 67 89",
    email: "contact@example.com",
    address: {
      street: "Rue de Test",
      streetNumber: "1",
      postalCode: "69000",
      city: "Lyon",
      country: "France",
    },
  })),
}));

type GlobalPatch = {
  MessageChannel?: unknown;
  TextEncoder?: unknown;
  TextDecoder?: unknown;
};

describe("NotFound page", () => {
  it("affiche le message 404 et des liens utiles", async () => {
    const globalPatch = global as GlobalPatch;
    if (typeof globalPatch.MessageChannel === "undefined") {
      globalPatch.MessageChannel = class {
        port1 = {};
        port2 = {};
      };
    }
    if (typeof globalPatch.TextEncoder === "undefined") {
      globalPatch.TextEncoder = TextEncoder;
      globalPatch.TextDecoder = TextDecoder;
    }

    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: NotFound } = await import("@/app/not-found");
    const page = await NotFound();
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Oups");
    expect(html).toContain("Réserver un trajet");
    expect(html).toContain("Retour à l");
    expect(html).toContain("01 23 45 67 89");
  });

  afterAll(() => {
    const globalPatch = global as GlobalPatch;
    delete globalPatch.MessageChannel;
    delete globalPatch.TextEncoder;
    delete globalPatch.TextDecoder;
  });
});
