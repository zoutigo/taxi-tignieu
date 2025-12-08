/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import DashboardServicesPage from "@/app/dashboard/services/page";

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

describe("DashboardServicesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("liste les catégories et liens vers les services", async () => {
    mockedPrisma.sCategory.findMany.mockResolvedValue([
      {
        id: 1,
        slug: "particuliers",
        title: "Particuliers",
        summary: "Résumé",
        position: 1,
        services: [
          {
            id: 11,
            slug: "trajets-classiques",
            title: "Trajets classiques",
            isEnabled: true,
            position: 1,
          },
        ],
      },
    ]);

    const html = renderToStaticMarkup(await DashboardServicesPage());

    expect(html).toContain("Particuliers");
    expect(html).toContain("Trajets classiques");
    expect(html).toContain('href="/dashboard/services/trajets-classiques"');
  });
});
