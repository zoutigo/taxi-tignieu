/** @jest-environment jsdom */

import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { SiteHeader } from "@/components/site-header";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ status: "unauthenticated", data: null })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    writable: true,
    configurable: true,
  });
}

describe("SiteHeader scroll behavior", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    setScroll(0);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("hides on scroll down and reappears on scroll up", () => {
    act(() => {
      root.render(<SiteHeader />);
    });

    const header = container.querySelector("header");
    expect(header?.className).toContain("translate-y-0");
    expect(header?.className).not.toContain("-translate-y-full");

    act(() => {
      setScroll(120);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(header?.className).toContain("-translate-y-full");

    act(() => {
      setScroll(20);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(header?.className).toContain("translate-y-0");
    expect(header?.className).not.toContain("-translate-y-full");
  });
});
