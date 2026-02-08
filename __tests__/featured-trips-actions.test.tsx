/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, back: jest.fn() }),
}));

describe("FeaturedTripsActions", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("redirige vers /dashboard quand on clique sur retour", () => {
    render(
      <FeaturedTripsActions
        backHref="/dashboard"
        backLabel="Retour au dashboard"
        showCreate={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /retour au dashboard/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
