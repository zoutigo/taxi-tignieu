/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { UsersTable } from "@/components/dashboard/users-table";

const users = Array.from({ length: 15 }).map((_, idx) => ({
  id: `u${idx}`,
  name: `User ${idx}`,
  email: `user${idx}@test.com`,
  phone: "0102030404",
  isAdmin: false,
  isManager: false,
  isDriver: false,
  bookings: [],
}));

describe("UsersTable pagination", () => {
  it("pagine et change de page", () => {
    const { getByText, getByDisplayValue, queryAllByText } = render(
      <UsersTable initialUsers={users} />
    );

    // par défaut 10 par page
    expect(queryAllByText(/User/).length).toBeGreaterThanOrEqual(10);
    expect(getByText("Page 1 / 2")).toBeTruthy();

    fireEvent.click(getByText("Suivant"));
    expect(getByText("Page 2 / 2")).toBeTruthy();
    expect(queryAllByText(/User/).length).toBeGreaterThan(0);

    // changer la page size
    const input = getByDisplayValue("10") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(getByText("Page 1 / 3")).toBeTruthy();
  });
});
