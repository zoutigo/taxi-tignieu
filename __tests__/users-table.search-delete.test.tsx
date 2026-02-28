/** @jest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UsersTable } from "@/components/dashboard/users-table";

const users = [
  {
    id: "u1",
    name: "Alice Martin",
    email: "alice@test.com",
    phone: "0101010101",
    isAdmin: false,
    isManager: false,
    isDriver: false,
    isActive: true,
    bookings: [],
  },
  {
    id: "u2",
    name: "Bob Dupont",
    email: "bob@test.com",
    phone: "0202020202",
    isAdmin: false,
    isManager: false,
    isDriver: false,
    isActive: true,
    bookings: [],
  },
];

describe("UsersTable search and activation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })) as unknown as typeof fetch;
  });

  it("filtre la liste via le champ de recherche", () => {
    render(<UsersTable initialUsers={users} />);

    fireEvent.change(screen.getByPlaceholderText(/nom, email ou téléphone/i), {
      target: { value: "alice" },
    });

    expect(screen.getByText("Alice Martin")).toBeTruthy();
    expect(screen.queryByText("Bob Dupont")).toBeNull();
  });

  it("désactive un utilisateur via le toggle", async () => {
    render(<UsersTable initialUsers={users} />);

    fireEvent.click(screen.getByLabelText("Désactiver Alice Martin"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/users",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Inactif")).toBeTruthy();
    });
  });

  it("réactive un utilisateur inactif via le toggle", async () => {
    render(<UsersTable initialUsers={[{ ...users[0], isActive: false }, users[1]]} />);

    fireEvent.click(screen.getByLabelText("Activer Alice Martin"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/users",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Désactiver Alice Martin")).toBeTruthy();
    });
  });
});
