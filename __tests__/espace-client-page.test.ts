import ClientDashboardPage from "@/app/espace-client/page";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const mockedAuth = auth as unknown as jest.MockedFunction<() => Promise<Session | null>>;
const mockedFindUnique = prisma.user.findUnique as unknown as jest.MockedFunction<
  () => Promise<User | null>
>;
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe("ClientDashboardPage workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirige vers l'accueil sans session", async () => {
    mockedAuth.mockResolvedValue(null);

    await expect(ClientDashboardPage({ searchParams: {} })).rejects.toThrow("REDIRECT:/");
    expect(mockedRedirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers l'accueil si l'utilisateur n'existe pas en base", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindUnique.mockResolvedValue(null);

    await expect(ClientDashboardPage({ searchParams: {} })).rejects.toThrow("REDIRECT:/");
  });

  it("redirige vers la complétion téléphone si le numéro est absent", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      name: "Test",
      phone: null,
      image: null,
      passwordHash: null,
      emailVerified: null,
      defaultAddressId: null,
      isAdmin: false,
      isManager: false,
      isDriver: false,
      createdAt: new Date(),
    } satisfies User);

    await expect(ClientDashboardPage({ searchParams: {} })).rejects.toThrow(
      "REDIRECT:/profil/completer-telephone?from=%2Fespace-client"
    );
  });

  it("rend la page quand le téléphone est présent", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      name: "Test",
      phone: "+33123456789",
      image: "https://api.dicebear.com/7.x/thumbs/svg?seed=test",
      passwordHash: null,
      emailVerified: null,
      defaultAddressId: null,
      isAdmin: false,
      isManager: false,
      isDriver: false,
      createdAt: new Date(),
      bookings: [
        {
          id: 1,
          userId: "u1",
          pickup: "A",
          dropoff: "B",
          dateTime: new Date(),
          pax: 1,
          luggage: 0,
          babySeat: false,
          notes: null,
          priceCents: null,
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          customerId: null,
        },
      ],
    } as unknown as User);

    const page = await ClientDashboardPage({ searchParams: {} });

    expect(page).toBeTruthy();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("redirige vers le choix d'avatar si image absente", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" } as Session);
    mockedFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      name: "Test",
      phone: "+33123456789",
      image: null,
      passwordHash: null,
      emailVerified: null,
      isAdmin: false,
      isManager: false,
      isDriver: false,
      createdAt: new Date(),
      bookings: [],
    } as unknown as User);

    await expect(ClientDashboardPage({ searchParams: {} })).rejects.toThrow(
      "REDIRECT:/profil/choisir-avatar?from=%2Fespace-client"
    );
  });
});
