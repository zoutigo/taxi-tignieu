/** @jest-environment jsdom */
import React from "react";
import { TextDecoder, TextEncoder } from "util";

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
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain("Oups");
    expect(html).toContain("Réserver un trajet");
    expect(html).toContain("Retour à l");
  });

  afterAll(() => {
    const globalPatch = global as GlobalPatch;
    delete globalPatch.MessageChannel;
    delete globalPatch.TextEncoder;
    delete globalPatch.TextDecoder;
  });
});
