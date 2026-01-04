/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { SiteHeader } from "@/components/site-header";
import { fireClick } from "@/tests/fire-event";

const pushMock = jest.fn();
const signOutMock = jest.fn();
const signInMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    prefetch,
    ...props
  }: {
    children: React.ReactNode;
    prefetch?: boolean;
  }) => <a {...props}>{children}</a>,
}));

describe("SiteHeader account menu", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pushMock.mockReset();
    signOutMock.mockReset();
    signInMock.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows client and logout actions when authenticated", () => {
    const useSession = jest.requireMock("next-auth/react").useSession as jest.Mock;
    useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { email: "user@test.fr", isAdmin: false, isManager: false } },
    });

    act(() => root.render(<SiteHeader />));

    const accountBtn = container.querySelector('button[aria-label="Ouvrir l\'espace client"]');
    expect(accountBtn).toBeTruthy();
    if (!accountBtn) return;
    act(() => {
      fireClick(accountBtn);
    });

    const buttons = Array.from(container.querySelectorAll("button"))
      .map((b) => (b.textContent ?? "").trim())
      .filter(Boolean);
    expect(buttons).toContain("Espace client");
    expect(buttons).toContain("Déconnexion");
    expect(buttons).not.toContain("Dashboard");
  });

  it("shows dashboard in account menu for admin", () => {
    const useSession = jest.requireMock("next-auth/react").useSession as jest.Mock;
    useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { email: "admin@test.fr", isAdmin: true } },
    });

    act(() => root.render(<SiteHeader />));

    const accountBtn = container.querySelector('button[aria-label="Ouvrir l\'espace client"]');
    expect(accountBtn).toBeTruthy();
    if (!accountBtn) return;
    act(() => {
      fireClick(accountBtn);
    });

    const buttons = Array.from(container.querySelectorAll("button"))
      .map((b) => (b.textContent ?? "").trim())
      .filter(Boolean);
    expect(buttons).toContain("Dashboard");
  });
});
