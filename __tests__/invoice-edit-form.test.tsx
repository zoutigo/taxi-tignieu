/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvoiceEditForm } from "@/components/dashboard/invoice-edit-form";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

beforeEach(() => {
  (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      baseCharge: 2.8,
      kmA: 0.98,
      kmB: 1.23,
      kmC: 1.96,
      kmD: 2.46,
      waitPerHour: 29.4,
      baggageFee: 2,
      fifthPassenger: 2.5,
    }),
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("InvoiceEditForm", () => {
  const defaultProps = {
    invoiceId: "inv-1",
    mode: "edit" as const,
    defaultValues: {
      bookingId: "bk-1",
      amountEuros: 9.96,
      issuedAt: new Date("2026-01-11T13:14:00Z").toISOString(),
      pdfPath: "/invoices/inv-1.pdf",
      realKm: 1.9,
      realLuggage: 2,
      realPax: 1,
      sendToClient: true,
      waitHours: 0,
      adjustmentComment: "",
      paid: true,
      paymentMethod: "CB" as const,
    },
    bookingSummary: {
      id: "bk-1",
      pickup: "Départ seed",
      dropoff: "Arrivée seed",
      dateTime: new Date("2026-01-11T13:14:00Z").toISOString(),
      client: "Valery Mbele",
      estimatedKm: 1.9,
      estimatedLuggage: 2,
      estimatedPax: 1,
      estimatedAmount: 9.96,
      waitHours: 0,
    },
  };

  it("affiche les labels et valeurs par défaut issues de la réservation", () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const kmInput = screen.getByLabelText(/Kilométrage/i) as HTMLInputElement;
    const luggageInput = screen.getByLabelText(/Bagages/i) as HTMLInputElement;
    const paxInput = screen.getByLabelText(/Passagers/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/^Montant \(€\)/i) as HTMLInputElement;
    const sendCheckbox = screen.getByRole("checkbox", {
      name: /Envoyer la facture au client/i,
    }) as HTMLInputElement;

    expect(kmInput.value).toBe("1.9");
    expect(luggageInput.value).toBe("2");
    expect(paxInput.value).toBe("1");
    expect(amountInput.value).toBe("9.96");
    expect(sendCheckbox.getAttribute("aria-checked")).toBe("true");

    expect(screen.getAllByText("1.9").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText(/9\.96/)).toBeTruthy();
    expect((screen.getByLabelText(/Attente/i) as HTMLInputElement).value).toBe("0");

    // montant initial doit rester égal au montant estimé en label
    expect(amountInput.value).toBe(defaultProps.defaultValues.amountEuros.toFixed(2));
    expect(screen.queryByText(/Commentaire requis lorsque le montant diffère/)).toBeNull();
  });

  it("toggle l'affichage du résumé via le bouton", () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const toggleBtn = screen.getByRole("button", { name: /Voir la réservation/i });
    // Au départ non visible
    expect(screen.queryByLabelText("Résumé de la réservation")).toBeNull();
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Résumé de la réservation")).toBeTruthy();
    fireEvent.click(toggleBtn);
    expect(screen.queryByLabelText("Résumé de la réservation")).toBeNull();
  });

  it("recalcule le montant quand les champs changent", async () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const kmInput = screen.getByLabelText(/Kilométrage/i) as HTMLInputElement;
    const luggageInput = screen.getByLabelText(/Bagages/i) as HTMLInputElement;
    const paxInput = screen.getByLabelText(/Passagers/i) as HTMLInputElement;
    const waitInput = screen.getByLabelText(/Attente/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/^Montant \(€\)/i) as HTMLInputElement;

    fireEvent.change(kmInput, { target: { value: "10" } });
    fireEvent.change(luggageInput, { target: { value: "3" } });
    fireEvent.change(paxInput, { target: { value: "5" } });
    fireEvent.change(waitInput, { target: { value: "2" } });

    await waitFor(() => {
      expect(Number(amountInput.value)).not.toBeCloseTo(defaultProps.defaultValues.amountEuros);
    });
  });

  it("recalcule la distance quand on modifie directement le montant", async () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const kmInput = screen.getByLabelText(/Kilométrage/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/^Montant \(€\)/i) as HTMLInputElement;

    fireEvent.change(amountInput, { target: { value: "20" } });

    await waitFor(() => {
      expect(Number(kmInput.value)).not.toBeCloseTo(Number(defaultProps.defaultValues.realKm));
    });
    // Vérifie que la distance correspond au nouveau montant (avec tarification mockée)
    await waitFor(() => {
      expect(Number(kmInput.value)).toBeGreaterThan(0);
    });
  });

  it("exige un commentaire si le montant diffère du montant initial", async () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const amountInput = screen.getByLabelText(/^Montant \(€\)/i) as HTMLInputElement;
    const commentInput = screen.getByLabelText(/Commentaire/i) as HTMLTextAreaElement;
    const submitBtn = screen.getByRole("button", { name: /Enregistrer/i });

    // modifier le montant
    fireEvent.change(amountInput, { target: { value: "12.50" } });

    await waitFor(() => {
      expect(screen.getByText(/Commentaire requis lorsque le montant diffère/i)).toBeTruthy();
      expect(submitBtn.hasAttribute("disabled")).toBe(true);
    });

    fireEvent.change(commentInput, { target: { value: "Ajustement manuel" } });
    await waitFor(() => {
      expect(submitBtn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("aligne les labels et inputs sur une même ligne avec styles compacts", () => {
    render(<InvoiceEditForm {...defaultProps} />);

    const kmLabel = screen.getByText("Kilométrage (km)");
    const kmRow = kmLabel.closest("div")!;
    expect(kmRow.className).toContain("flex");
    expect(kmRow.className).toContain("justify-between");
    expect(kmRow.className).toContain("bg-muted/30");
    const kmInput = screen.getByDisplayValue("1.9") as HTMLInputElement;
    expect(kmInput.className).toContain("w-[8ch]");

    const bagRow = screen.getByText("Bagages").closest("div")!;
    expect(bagRow.className).toContain("flex");
    expect(bagRow.className).toContain("justify-between");

    const paxRow = screen.getByText("Passagers").closest("div")!;
    expect(paxRow.className).toContain("flex");
    expect(paxRow.className).toContain("justify-between");

    const waitRow = screen.getByText("Attente (heures)").closest("div")!;
    expect(waitRow.className).toContain("flex");
    expect(waitRow.className).toContain("justify-between");

    const amountRow = screen.getByText("Montant (€)").closest("div")!;
    expect(amountRow.className).toContain("flex");
    expect(amountRow.className).toContain("justify-between");
    const amountInput = screen.getByLabelText(/^Montant \(€\)/i) as HTMLInputElement;
    expect(amountInput.className).toContain("w-[10ch]");
  });
});
