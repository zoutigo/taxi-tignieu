/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewStatus, type Review } from "@prisma/client";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  typeof prisma.review.findMany
>;

describe("Landing reviews section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche les 3 derniers avis approuvés avec note et lien plus d'avis", async () => {
    const base: Pick<Review, "bookingId" | "status" | "updatedAt"> = {
      bookingId: null,
      status: ReviewStatus.APPROVED,
      updatedAt: new Date("2025-01-03"),
    };

    const reviews: Review[] = [
      {
        id: 1,
        userId: "u1",
        rating: 5,
        comment: "Parfait",
        createdAt: new Date("2025-01-03"),
        ...base,
      },
      {
        id: 2,
        userId: "u2",
        rating: 4,
        comment: "Très bien",
        createdAt: new Date("2025-01-02"),
        ...base,
      },
      {
        id: 3,
        userId: "u3",
        rating: 5,
        comment: "Rapide et pro",
        createdAt: new Date("2025-01-01"),
        ...base,
      },
    ];

    mockedFindMany.mockResolvedValue(reviews);

    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Ils nous font confiance");
    expect(html).toMatch(/Parfait|Très bien|Rapide et pro/);
    expect(html).toContain("avis");
  });

  it("affiche un fallback si aucun avis", async () => {
    mockedFindMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Ils nous font confiance");
    expect(html).toContain("Service impeccable");
  });
});
