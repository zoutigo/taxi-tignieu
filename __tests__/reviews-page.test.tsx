/**
 * @jest-environment node
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AvisPage from "@/app/avis/page";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import type { Review } from "@prisma/client";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/components/reviews-public-list", () => ({
  ReviewsPublicList: ({ reviews }: { reviews: Array<{ id: number }> }) => (
    <div data-testid="public-list">{reviews.length} avis</div>
  ),
}));

jest.mock("@/components/reviews-form", () => ({
  ReviewsForm: () => <div data-testid="reviews-form">FORM</div>,
}));

type ReviewWithUser = Review & { user: { name: string | null; image: string | null } };

const mockedAuth = auth as unknown as jest.MockedFunction<() => Promise<Session | null>>;
const mockedFindFirst = prisma.review.findFirst as unknown as jest.MockedFunction<
  typeof prisma.review.findFirst
>;
const mockedFindMany = prisma.review.findMany as unknown as jest.MockedFunction<
  () => Promise<ReviewWithUser[]>
>;

const makeReview = (overrides: Partial<ReviewWithUser> = {}): ReviewWithUser => ({
  id: overrides.id ?? "r1",
  userId: overrides.userId ?? "u1",
  bookingId: overrides.bookingId ?? null,
  rating: overrides.rating ?? 5,
  comment: overrides.comment ?? "Super",
  status: overrides.status ?? "APPROVED",
  createdAt: overrides.createdAt ?? new Date("2025-01-02T10:00:00Z"),
  updatedAt: overrides.updatedAt ?? new Date("2025-01-02T10:00:00Z"),
  user: overrides.user ?? {
    name: "Alice",
    image: "https://api.dicebear.com/7.x/thumbs/svg?seed=test",
  },
});

describe("AvisPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche la moyenne, le total, les étoiles, le CTA et le formulaire pour un utilisateur sans avis", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindFirst.mockResolvedValue(null);
    mockedFindMany.mockResolvedValue([
      makeReview({ rating: 5 }),
      makeReview({ id: "r2", rating: 4 }),
    ]);

    const html = renderToStaticMarkup(await AvisPage());

    const normalized = html.replace(/\u00a0/g, " ");
    expect(normalized).toContain("Moyenne");
    expect(normalized).toContain("4.5 / 5");
    expect(html).toMatch(/Total\s*:<\/span>\s*2/);
    expect(html).toMatch(/style="width:\s*90%/);
    expect(normalized).toContain("Laissez votre avis");
    expect(normalized).toContain("Laisser un avis");
    expect(normalized).not.toContain("Connectez vous pour laisser un avis");
  });

  it("n’affiche pas le formulaire si l’utilisateur n’est pas connecté", async () => {
    mockedAuth.mockResolvedValue(null);
    mockedFindFirst.mockResolvedValue(null);
    mockedFindMany.mockResolvedValue([makeReview()]);

    const html = renderToStaticMarkup(await AvisPage());

    expect(html).not.toContain("Laisser un avis");
    expect(html).toContain("Connectez vous pour laisser un avis");
  });

  it("n’affiche pas le formulaire si un avis existe déjà", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindFirst.mockResolvedValue(makeReview());
    mockedFindMany.mockResolvedValue([makeReview()]);

    const html = renderToStaticMarkup(await AvisPage());

    expect(html).not.toContain("Laisser un avis");
  });

  it("affiche le formulaire si connecté et sans avis existant", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindFirst.mockResolvedValue(null);
    mockedFindMany.mockResolvedValue([makeReview()]);

    const html = renderToStaticMarkup(await AvisPage());

    expect(html).toContain("Laisser un avis");
  });
});
