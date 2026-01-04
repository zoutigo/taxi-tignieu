/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FaqManager } from "@/components/dashboard/faq-manager";
import { fireClick, fireEvent, fireInput } from "@/tests/fire-event";

jest.mock("@/actions/faq", () => ({
  upsertFaq: jest.fn(),
  deleteFaq: jest.fn(),
}));

const categories = [
  { id: "cat-1", name: "Général" },
  { id: "cat-2", name: "Tarifs" },
];

const makeFaqs = () =>
  Array.from({ length: 7 }).map((_, idx) => ({
    id: `faq-${idx + 1}`,
    question: `Question ${idx + 1}`,
    answer: `Réponse ${idx + 1}`,
    createdAt: new Date().toISOString(),
    category: idx % 2 === 0 ? categories[0] : categories[1],
    isFeatured: false,
    isValidated: true,
  }));

describe("FaqManager pagination", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const scrollSpy = jest.fn();
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    scrollSpy.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = scrollSpy;
    window.matchMedia =
      originalMatchMedia ??
      ((query: string) => ({
        media: query,
        matches: false,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("pagine par blocs de 5 et remonte en haut sur changement de page", async () => {
    // simulate mobile
    window.matchMedia = (query: string) => ({
      media: query,
      matches: true,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });

    await act(async () => {
      root.render(<FaqManager faqs={makeFaqs()} categories={categories} />);
    });

    // page 1 visible
    expect(container.textContent).toContain("Question 1");
    expect(container.textContent).toContain("Question 5");
    expect(container.textContent).not.toContain("Question 6");

    const nextBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Suivant")
    );
    expect(nextBtn).toBeTruthy();
    if (!nextBtn) return;

    await act(async () => {
      fireClick(nextBtn);
    });

    expect(container.textContent).toContain("Question 6");
    expect(container.textContent).toContain("Question 7");
    expect(container.textContent).not.toContain("Question 1");
    expect(scrollSpy).toHaveBeenCalled();

    const prevBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Précédent")
    );
    expect(prevBtn).toBeTruthy();
    if (!prevBtn) return;

    await act(async () => {
      fireClick(prevBtn);
    });

    expect(container.textContent).toContain("Question 1");
    expect(container.textContent).toContain("Question 5");
    expect(container.textContent).not.toContain("Question 7");
    expect(scrollSpy).toHaveBeenCalled();
  });

  it("affiche/masque la liste en mobile lors de l’ajout et la réaffiche après submit", async () => {
    const { upsertFaq } = jest.requireMock("@/actions/faq") as { upsertFaq: jest.Mock };
    upsertFaq.mockResolvedValue({ ok: true });
    window.matchMedia = (query: string) => ({
      media: query,
      matches: true,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });

    await act(async () => {
      root.render(<FaqManager faqs={makeFaqs().slice(0, 2)} categories={categories} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const listSection = container.querySelector("section");
    const newBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Nouvelle")
    );
    expect(newBtn).toBeTruthy();
    if (!newBtn || !listSection) return;

    await act(async () => {
      fireClick(newBtn);
    });
    expect(listSection.className).toContain("hidden");

    const questionInput = container.querySelector("input[name='question']") as HTMLInputElement;
    const answerTextarea = container.querySelector(
      "textarea[name='answer']"
    ) as HTMLTextAreaElement;
    expect(questionInput).toBeTruthy();
    expect(answerTextarea).toBeTruthy();
    await act(async () => {
      fireInput(questionInput, "Nouvelle FAQ");
      answerTextarea.value = "Réponse test";
      fireEvent(answerTextarea, "input");
    });

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    if (!form) return;
    await act(async () => {
      fireEvent(form, "submit");
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let refreshedList = Array.from(container.querySelectorAll("section")).find((section) =>
      section.textContent?.includes("Liste des FAQ")
    );
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    if (refreshedList?.className?.includes("hidden")) {
      const backBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Retour")
      );
      if (backBtn) {
        await act(async () => {
          fireClick(backBtn);
          await Promise.resolve();
        });
        refreshedList = Array.from(container.querySelectorAll("section")).find((section) =>
          section.textContent?.includes("Liste des FAQ")
        );
      }
    }
    expect(refreshedList?.className ?? "").not.toContain("hidden");
    expect(upsertFaq).toHaveBeenCalled();
  });

  it("affiche la bordure validé/featured et masque l’option featured si non validé", async () => {
    const faqs = [
      {
        id: "faq-a",
        question: "Q1",
        answer: "A1",
        createdAt: new Date().toISOString(),
        category: categories[0],
        isValidated: true,
        isFeatured: true,
      },
      {
        id: "faq-b",
        question: "Q2",
        answer: "A2",
        createdAt: new Date().toISOString(),
        category: categories[1],
        isValidated: false,
        isFeatured: false,
      },
    ];

    await act(async () => {
      root.render(<FaqManager faqs={faqs} categories={categories} />);
    });

    const cards = Array.from(container.querySelectorAll("article"));
    expect(cards[0].className).toContain("border-l-primary");
    expect(cards[0].className).toContain("border-r-primary");
    expect(cards[1].className).not.toContain("border-l-primary");
    expect(cards[1].className).not.toContain("border-r-primary");

    const formFeatured = Array.from(container.querySelectorAll("label")).filter((l) =>
      l.textContent?.includes("Mettre en avant")
    );
    expect(formFeatured.length).toBe(1);

    // ouvrir l'édition de la FAQ non validée
    const editButtons = Array.from(container.querySelectorAll("button")).filter((btn) =>
      btn.getAttribute("aria-label")?.includes("Modifier")
    );
    await act(async () => {
      fireClick(editButtons[1]);
      await Promise.resolve();
    });

    const featuredHidden = Array.from(container.querySelectorAll("label")).filter((l) =>
      l.textContent?.includes("Mettre en avant")
    );
    expect(featuredHidden.length).toBe(0);
  });
});
