/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import DashboardPage from "@/app/dashboard/page";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getPermissionsForUser: jest.fn(),
  getUserRole: jest.fn(),
}));

jest.mock("@/components/back-button", () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

const mockedAuth = jest.requireMock("@/auth").auth as jest.Mock;
const mockedGetPerms = jest.requireMock("@/lib/permissions").getPermissionsForUser as jest.Mock;
const mockedGetRole = jest.requireMock("@/lib/permissions").getUserRole as jest.Mock;

const basePerms = {
  users: { canView: false },
  bookings: { canView: false },
  services: { canView: false },
  reviews: { canView: false },
  "site-info": { canView: false },
  faq: { canView: false },
};

describe("Dashboard - visibilité des modules selon permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche uniquement les modules autorisés pour un manager", async () => {
    mockedAuth.mockResolvedValue({ user: { email: "m@test.fr", isManager: true } });
    mockedGetRole.mockReturnValue("MANAGER");
    mockedGetPerms.mockResolvedValue({
      ...basePerms,
      faq: { canView: true },
    });

    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("/dashboard/faq");
    expect(html).not.toContain("/dashboard/services");
    expect(html).not.toContain("/dashboard/users");
  });

  it("affiche uniquement les modules autorisés pour un driver", async () => {
    mockedAuth.mockResolvedValue({ user: { email: "d@test.fr", isDriver: true } });
    mockedGetRole.mockReturnValue("DRIVER");
    mockedGetPerms.mockResolvedValue({
      ...basePerms,
      bookings: { canView: true },
    });

    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("/dashboard/bookings");
    expect(html).not.toContain("/dashboard/faq");
    expect(html).not.toContain("/dashboard/roles");
  });
});
