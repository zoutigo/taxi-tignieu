/** @jest-environment jsdom */

import React from "react";
import renderer, { act } from "react-test-renderer";
import { SiteHeader } from "@/components/site-header";
import { signOut, useSession } from "next-auth/react";

const pushMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

jest.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe("SiteHeader actions", () => {
  beforeEach(() => {
    // Silence act() warnings and mark environment as act-safe for react-test-renderer
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.spyOn(console, "error").mockImplementation(() => {});

    pushMock.mockReset();
    (signOut as jest.Mock).mockReset();
    (useSession as jest.Mock).mockReturnValue({ status: "authenticated" });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  function openMenu(tree: renderer.ReactTestRenderer) {
    const menuBtn = tree.root.find(
      (node) => node.type === "button" && node.props["aria-label"] === "Ouvrir le menu"
    );
    act(() => {
      (menuBtn.props.onClick as () => void)();
    });
  }

  function openAccountMenu(tree: renderer.ReactTestRenderer) {
    const accountBtn = tree.root.find((node) => {
      if (node.type !== "button") return false;
      const aria = node.props["aria-label"] as string | undefined;
      return Boolean(aria?.toLowerCase().includes("espace client"));
    });
    act(() => {
      (accountBtn.props.onClick as () => void)();
    });
  }

  it("le lien Avis pointe vers /avis", () => {
    let tree: renderer.ReactTestRenderer | null = null;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const avisLinks = tree!.root.findAll(
      (node) => node.type === "a" && node.props.children === "Avis"
    );
    expect(avisLinks.some((link) => link.props.href === "/avis")).toBe(true);
  });

  it("le lien Contact pointe vers /contact", () => {
    let tree: renderer.ReactTestRenderer | null = null;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const contactLinks = tree!.root.findAll(
      (node) => node.type === "a" && node.props.children === "Contact"
    );
    expect(contactLinks.some((link) => link.props.href === "/contact")).toBe(true);
  });

  it("le lien Services pointe vers /services", () => {
    let tree: renderer.ReactTestRenderer | null = null;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const servicesLinks = tree!.root.findAll(
      (node) => node.type === "a" && node.props.children === "Services"
    );
    expect(servicesLinks.some((link) => link.props.href === "/services")).toBe(true);
  });

  it("affiche le Dashboard pour admin/manager", () => {
    (useSession as jest.Mock).mockReturnValue({
      status: "authenticated",
      data: { user: { isAdmin: true } },
    });
    let tree: renderer.ReactTestRenderer | null = null;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const dashLink = tree!.root.find(
      (node) => node.type === "a" && node.props.children === "Dashboard"
    );
    expect(dashLink.props.href).toBe("/dashboard");
  });

  it("redirige vers l'espace client quand on clique sur le bouton dédié", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const btn = tree!.root.find(
      (node: renderer.ReactTestInstance) =>
        node.type === "button" && node.props.children === "Espace client"
    );

    const onClick = btn.props.onClick as (() => void) | undefined;
    expect(onClick).toBeDefined();
    onClick?.();
    expect(pushMock).toHaveBeenCalledWith("/espace-client");
  });

  it("déclenche le logout via signOut", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const btn = tree!.root.find(
      (node: renderer.ReactTestInstance) =>
        node.type === "button" && node.props.children === "Se déconnecter"
    );

    const onClick = btn.props.onClick as (() => void) | undefined;
    expect(onClick).toBeDefined();
    onClick?.();
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("le menu latéral est scrollable", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openMenu(tree!);
    const panel = tree!.root.find(
      (node) =>
        typeof node.props.className === "string" && node.props.className.includes("overflow-y-auto")
    );
    expect(panel).toBeTruthy();
  });

  it("ouvre le menu compte desktop avec Espace client et Déconnexion", () => {
    (useSession as jest.Mock).mockReturnValue({
      status: "authenticated",
      data: { user: { email: "user@test.fr" } },
    });
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openAccountMenu(tree!);
    const espaceClient = tree!.root.findAll(
      (node) => node.type === "button" && node.props.children === "Espace client"
    );
    const logout = tree!.root.findAll(
      (node) => node.type === "button" && node.props.children === "Déconnexion"
    );
    expect(espaceClient.length).toBeGreaterThan(0);
    expect(logout.length).toBeGreaterThan(0);
  });

  it("affiche Dashboard dans le menu compte pour admin", () => {
    (useSession as jest.Mock).mockReturnValue({
      status: "authenticated",
      data: { user: { email: "admin@test.fr", isAdmin: true } },
    });
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SiteHeader />);
    });
    openAccountMenu(tree!);
    const dashboard = tree!.root.findAll(
      (node) => node.type === "button" && node.props.children === "Dashboard"
    );
    expect(dashboard.length).toBeGreaterThan(0);
  });
});
