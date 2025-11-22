import { NextRequest } from "next/server";
import { phoneCompletionGuard } from "@/lib/phone-guard";

function createRequest(path: string, auth?: Parameters<typeof phoneCompletionGuard>[0]["auth"]) {
  const url = new URL(path, "https://example.com");
  const req = new NextRequest(url);
  (req as unknown as { auth?: typeof auth }).auth = auth;
  return req;
}

describe("phoneCompletionGuard", () => {
  it("redirige vers le formulaire téléphone lorsqu'un utilisateur authentifié n'a pas renseigné de numéro", async () => {
    const req = createRequest("/espace-client", {
      user: { id: "u1", phone: null },
      expires: "",
    });

    const res = await phoneCompletionGuard(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get("Location")).toBe("https://example.com/profil/completer-telephone");
  });

  it("redirige vers l'espace client lorsque l'utilisateur possède déjà un numéro et tente d'accéder au formulaire", async () => {
    const req = createRequest("/profil/completer-telephone", {
      user: { id: "u1", phone: "+33123456789" },
      expires: "",
    });

    const res = await phoneCompletionGuard(req);

    expect(res?.status).toBe(307);
    expect(res?.headers.get("Location")).toBe("https://example.com/espace-client");
  });
});
