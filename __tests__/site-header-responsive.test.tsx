/** @jest-environment jsdom */

import type { Session } from "next-auth";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SiteHeader } from "@/components/site-header";

type SessionResult = {
  status: "loading" | "authenticated" | "unauthenticated";
  data: Session | null;
};

const mockUseSession = jest.fn<SessionResult, []>(() => ({
  status: "unauthenticated",
  data: null,
}));
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("SiteHeader responsive layout", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    mockUseSession.mockReset();
  });

  it("renders desktop nav links and auth icon for large screens", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    act(() => {
      root.render(<SiteHeader />);
    });

    const nav = container.querySelector("nav");
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toMatch(/Services/);
    expect(nav?.className).toContain("md:flex");

    const userButton = container.querySelector('button[aria-label="Se connecter"]');
    expect(userButton).toBeTruthy();
    expect(userButton?.className).toContain("md:inline-flex");
    expect(userButton?.className).toContain("text-white");

    const menuButton = container.querySelector('button[aria-label="Ouvrir le menu"]');
    expect(menuButton?.className).toContain("md:hidden");
  });

  it("keeps only the menu trigger visible on mobile layout (classes)", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    act(() => {
      root.render(<SiteHeader />);
    });

    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("hidden");
    expect(nav?.className).toContain("md:flex");

    const userButton = container.querySelector('button[aria-label="Se connecter"]');
    const accountWrapper = userButton?.parentElement;
    expect(accountWrapper?.className).toContain("hidden");
    expect(accountWrapper?.className).toContain("md:flex");
    expect(userButton?.className).toContain("md:inline-flex");
    expect(userButton?.className).toContain("text-white");

    const menuButton = container.querySelector('button[aria-label="Ouvrir le menu"]');
    expect(menuButton).toBeTruthy();
    expect(menuButton?.className).toContain("md:hidden");
  });

  it("shows green auth icon when authenticated and switches from unauthenticated", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    act(() => {
      root.render(<SiteHeader />);
    });
    const userButton = container.querySelector(
      'button[aria-label="Ouvrir l\'espace client"], button[aria-label="Se connecter"]'
    );
    expect(userButton).toBeTruthy();
    expect(userButton?.className).toContain("text-white");
    expect(userButton?.className).not.toContain("text-emerald");

    const authedSession: Session = {
      user: { id: "u1", email: "test@test.com" },
      expires: "2030-01-01T00:00:00.000Z",
    };
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: authedSession,
    });
    act(() => {
      root.render(<SiteHeader />);
    });

    const authedButton = container.querySelector('button[aria-label="Ouvrir l\'espace client"]');
    expect(authedButton).toBeTruthy();
    expect(authedButton?.className).toContain("text-emerald");
    expect(authedButton?.className).toContain("border-emerald");
  });
});
