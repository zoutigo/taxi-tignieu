/**
 * @jest-environment node
 */
import { AppMessage } from "@/components/app-message";

describe("AppMessage", () => {
  it("expose un className de succès et le texte", () => {
    const el = AppMessage({ variant: "success", children: "OK" });
    expect(el.props.className).toContain("bg-emerald");
    const span = (el.props.children as Array<{ props?: { children?: string } }>).find(
      (c) => c?.props?.children === "OK"
    );
    expect(span).toBeTruthy();
  });

  it("expose un className d’erreur et le texte", () => {
    const el = AppMessage({ variant: "error", children: "Erreur" });
    expect(el.props.className).toMatch(/rose|error/);
    const span = (el.props.children as Array<{ props?: { children?: string } }>).find(
      (c) => c?.props?.children === "Erreur"
    );
    expect(span).toBeTruthy();
  });
});
