import { POST } from "@/app/api/reviews/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockedAuth = auth as unknown as jest.Mock<Promise<unknown>, unknown[]>;
const mockedFindFirst = prisma.review.findFirst as unknown as jest.Mock<
  Promise<unknown>,
  unknown[]
>;
const mockedCreate = prisma.review.create as unknown as jest.Mock<Promise<unknown>, unknown[]>;

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/reviews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse un second avis pour le même utilisateur", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } });
    mockedFindFirst.mockResolvedValue({ id: 1 });

    const res = await POST(makeRequest({ rating: 5, comment: "Top" }));

    expect(res.status).toBe(409);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("crée un avis si aucun existant", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" } });
    mockedFindFirst.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 2 });

    const res = await POST(makeRequest({ rating: 5, comment: "Top" }));

    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalled();
  });
});
