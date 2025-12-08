/**
 * @jest-environment node
 */
import { getServiceGroups, serviceGroups } from "@/app/services/data";

jest.mock("@/lib/prisma", () => {
  const mockFindMany = jest.fn();
  return {
    prisma: {
      sCategory: { findMany: mockFindMany },
    },
  };
});

const mockedPrisma = jest.requireMock("@/lib/prisma").prisma as {
  sCategory: { findMany: jest.Mock };
};

describe("getServiceGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renvoie les catégories de la base en filtrant les services désactivés", async () => {
    mockedPrisma.sCategory.findMany.mockResolvedValue([
      {
        slug: "particuliers",
        title: "Particuliers",
        summary: "Résumé",
        position: 1,
        services: [
          {
            title: "Service actif",
            description: "Texte",
            isEnabled: true,
            highlights: [{ label: "Highlight 1" }],
          },
          {
            title: "Service désactivé",
            description: "Texte 2",
            isEnabled: false,
            highlights: [],
          },
        ],
      },
    ]);

    const groups = await getServiceGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toEqual([
      { title: "Service actif", description: "Texte", highlights: ["Highlight 1"] },
    ]);
  });

  it("retourne le fallback statique en cas d'erreur", async () => {
    const originalError = console.error;
    console.error = jest.fn();
    try {
      mockedPrisma.sCategory.findMany.mockRejectedValue(new Error("DB error"));
      const groups = await getServiceGroups();
      expect(groups).toEqual(serviceGroups);
    } finally {
      console.error = originalError;
    }
  });
});
