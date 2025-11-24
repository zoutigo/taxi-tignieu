/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ReviewsPublicList } from "@/components/reviews-public-list";

const reviews = [
  {
    id: 1,
    userId: "u1",
    bookingId: null,
    rating: 5,
    comment: "Avis A",
    status: "APPROVED" as const,
    createdAt: new Date("2025-01-02T10:00:00Z"),
    updatedAt: new Date("2025-01-02T10:00:00Z"),
    user: { name: "Alice", image: "https://api.dicebear.com/7.x/thumbs/svg?seed=test" },
  },
  {
    id: 2,
    userId: "u2",
    bookingId: null,
    rating: 4,
    comment: "Avis B",
    status: "APPROVED" as const,
    createdAt: new Date("2025-01-01T10:00:00Z"),
    updatedAt: new Date("2025-01-01T10:00:00Z"),
    user: { name: "Bob" },
  },
];

describe("ReviewsPublicList", () => {
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const textFromChildren = (val: unknown): string => {
    if (typeof val === "string" || typeof val === "number") return String(val);
    if (Array.isArray(val)) return val.map(textFromChildren).join(" ");
    if (val && typeof val === "object" && "props" in val) {
      return textFromChildren((val as { props?: { children?: unknown } }).props?.children);
    }
    return "";
  };

  it("affiche les avis avec noms et commentaires", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsPublicList reviews={reviews} />);
    });
    const root = tree!.root;
    const text = root
      .findAll(() => true)
      .map((n) => textFromChildren(n.props?.children))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    expect(text).toContain("Alice");
    expect(text).toContain("Avis A");
    expect(text).toContain("Bob");
    expect(text).toContain("Avis B");
  });

  it("affiche la date et le nom sur la même ligne", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsPublicList reviews={reviews} />);
    });
    const root = tree!.root;
    const card = root.find((n) => textFromChildren(n.props.children).includes("Avis A"));
    const cardText = textFromChildren(card.props.children);
    expect(cardText).toContain("Alice");
    expect(cardText).toContain("02 janv. 2025");
  });

  it("pagine la liste", () => {
    const many = Array.from({ length: 12 }).map((_, idx) => ({
      ...reviews[0],
      id: idx + 1,
      comment: `Avis ${idx + 1}`,
    }));
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewsPublicList reviews={many} />);
    });
    const root = tree!.root;
    const nextBtn = root.find((n) => n.type === "button" && n.props.children === "Suivant");
    act(() => {
      (nextBtn.props.onClick as () => void)();
    });
    const label = root.find((n) => {
      const txt = textFromChildren(n.props.children).replace(/\s+/g, " ").trim();
      return typeof txt === "string" && txt.includes("Page");
    });
    const labelText = textFromChildren(label.props.children).replace(/\s+/g, " ").trim();
    expect(labelText).toContain("2 / 2");
  });
});
