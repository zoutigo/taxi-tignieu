/**
 * @jest-environment jsdom
 */
import renderer, { act } from "react-test-renderer";
import { ContactForm } from "@/components/contact-form";
import { useSession, signIn } from "next-auth/react";

jest.mock("react-hook-form", () => {
  let values: Record<string, string> = { category: "", subject: "", message: "" };
  let lastSubmit: (() => Promise<void>) | null = null;
  return {
    __setValues: (next: Record<string, string>) => {
      values = next;
    },
    __getLastSubmit: () => lastSubmit,
    useForm: () => ({
      register: (name: string) => ({
        name,
        onChange: (e: { target: { value: string } }) => {
          values[name] = e.target.value;
        },
      }),
      handleSubmit: (cb: (vals: typeof values) => unknown) => {
        const runner = async () => {
          await cb(values);
        };
        lastSubmit = runner;
        return runner;
      },
      reset: (next?: typeof values) => {
        if (next) values = next;
      },
      formState: { errors: {}, isSubmitting: false },
    }),
  };
});

const pushMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/components/app-message", () => ({
  AppMessage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const formMock = jest.requireMock("react-hook-form") as {
  __setValues: (v: Record<string, string>) => void;
  __getLastSubmit: () => (() => Promise<void>) | null;
};

describe("ContactForm workflow", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (useSession as jest.Mock).mockReturnValue({ data: null, status: "unauthenticated" });
    (signIn as jest.Mock).mockReset();
    pushMock.mockReset();
    (global.fetch as unknown) = jest.fn();
    localStorage.clear();
    formMock.__setValues({
      category: "Réservation",
      subject: "Sujet test",
      message: "Message test complet",
    });
  });

  const renderAndSubmit = async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ContactForm />);
    });
    const submitFn = formMock.__getLastSubmit();
    if (submitFn) {
      await act(async () => {
        await submitFn();
      });
    }
    return tree!;
  };

  it("invite à l’authentification si non connecté", async () => {
    await renderAndSubmit();
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/contact" });
    expect(localStorage.getItem("contact-draft")).toBeTruthy();
  });

  it("redirige vers la complétion téléphone si manquant", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
    });
    await renderAndSubmit();
    expect(pushMock).toHaveBeenCalledWith("/profil/completer-telephone");
  });

  it("envoie le message si connecté avec téléphone", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: "u1", phone: "010203" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    const tree = await renderAndSubmit();
    const html = JSON.stringify(tree.toJSON());
    expect(html).toContain("Message envoyé");
  });

  it("affiche une erreur si l’API échoue", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: "u1", phone: "010203" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });
    const tree = await renderAndSubmit();
    const html = JSON.stringify(tree.toJSON());
    expect(html).toContain("Impossible d'envoyer");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
});
