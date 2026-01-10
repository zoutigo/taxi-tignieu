/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useController, useForm } from "react-hook-form";
import { ReservationPolicyConsent } from "@/components/reservation-policy-consent";
import { Form } from "@/components/ui/form";

type PoliciesOnly = { policiesAccepted: boolean };

const Wrapper = ({ defaultValue = false }: { defaultValue?: boolean }) => {
  const form = useForm<PoliciesOnly>({
    defaultValues: { policiesAccepted: defaultValue },
  });
  const { field } = useController({
    name: "policiesAccepted",
    control: form.control,
  });

  return (
    <Form {...form}>
      <form>
        <ReservationPolicyConsent field={field} />
      </form>
    </Form>
  );
};

describe("ReservationPolicyConsent", () => {
  it("renders checkbox and policy links aligned in a flex container", () => {
    render(<Wrapper />);

    const container = screen.getByTestId("policies-consent");
    expect(container?.className).toContain("flex");
    expect(container?.className).toContain("items-center");

    const privacyLink = screen.getByRole("link", { name: /politique de confidentialité/i });
    const legalLink = screen.getByRole("link", { name: /mentions légales/i });
    expect(privacyLink.getAttribute("href")).toBe("/politique-de-confidentialite");
    expect(legalLink.getAttribute("href")).toBe("/mentions-legales");
  });

  it("toggles the checkbox state when clicked", () => {
    render(<Wrapper />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });
});
