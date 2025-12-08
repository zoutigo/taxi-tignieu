/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import DashboardServiceDetailPage from "@/app/dashboard/services/[slug]/page";

jest.mock("@/lib/prisma", () => {
  const mockFindUnique = jest.fn();
  const mockFindMany = jest.fn();
  return {
    prisma: {
      service: { findUnique: mockFindUnique },
      sCategory: { findMany: mockFindMany },
    },
  };
});

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
  })),
}));

const mockedPrisma = jest.requireMock("@/lib/prisma").prisma as {
  service: { findUnique: jest.Mock };
  sCategory: { findMany: jest.Mock };
};

describe("DashboardServiceDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rend le formulaire avec titre, slug et highlights", async () => {
    mockedPrisma.service.findUnique.mockResolvedValue({
      id: 1,
      slug: "trajets-classiques",
      title: "Trajets classiques",
      description: "Desc",
      isEnabled: true,
      position: 1,
      categoryId: 10,
      category: { id: 10, title: "Particuliers", slug: "particuliers" },
      highlights: [{ id: 1, label: "Highlight", position: 1 }],
    });
    mockedPrisma.sCategory.findMany.mockResolvedValue([
      { id: 10, title: "Particuliers", slug: "particuliers", position: 1 },
    ]);

    const html = renderToStaticMarkup(
      await DashboardServiceDetailPage({ params: Promise.resolve({ slug: "trajets-classiques" }) })
    );

    expect(html).toContain("Trajets classiques");
    expect(html).toContain("trajets-classiques");
    expect(html).toContain("Particuliers");
    expect(html).toContain("Highlight");
  });

  it("appelle notFound si le service est introuvable", async () => {
    const { notFound } = jest.requireMock("next/navigation");
    mockedPrisma.service.findUnique.mockResolvedValue(null);

    await expect(
      DashboardServiceDetailPage({ params: Promise.resolve({ slug: "inconnu" }) })
    ).rejects.toThrow("not-found");
    expect(notFound).toHaveBeenCalled();
  });
});
