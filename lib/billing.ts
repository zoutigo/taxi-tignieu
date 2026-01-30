import fs from "fs";
import path from "path";
import type { Booking, Address, User } from "@prisma/client";
import { invoicePalette } from "../pdf-template/invoice-template";

export type BookingWithRelations = Booking & {
  pickup: Address | null;
  dropoff: Address | null;
  user?: User | null;
  customer?: { fullName?: string | null; email?: string | null; phone?: string | null } | null;
};

const INVOICES_DIR = path.join(process.cwd(), "invoices");

function ensureDir() {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
  }
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatAddress(addr: Address | null) {
  if (!addr) return "—";
  if (addr.name) return addr.name;
  const parts = [addr.streetNumber, addr.street, addr.postalCode, addr.city, addr.country]
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean);
  return parts.join(" ");
}

export type CompanyInfo = {
  name: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  siret?: string | null;
  ape?: string | null;
};

type Color = { r: number; g: number; b: number };
function hexToRgb(hex: string): Color {
  const normalized = hex.replace("#", "");
  const int = parseInt(normalized, 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}

function drawRect(x: number, y: number, w: number, h: number, color: Color) {
  return `${color.r} ${color.g} ${color.b} rg\n${x} ${y} ${w} ${h} re f\n0 0 0 rg\n`;
}

function drawText(
  text: string,
  x: number,
  y: number,
  fontRef: string,
  size: number,
  color: Color = { r: 0, g: 0, b: 0 }
) {
  return `${color.r} ${color.g} ${color.b} rg\nBT /${fontRef} ${size} Tf ${x} ${y} Td (${escapePdfText(
    text
  )}) Tj ET\n0 0 0 rg\n`;
}

export async function generateInvoicePdf(
  booking: BookingWithRelations,
  amountEuros: number,
  company?: CompanyInfo,
  opts?: {
    invoiceNumber?: string;
    issueDate?: Date;
    serviceDate?: Date;
    distanceKm?: number | null;
    passengers?: number | null;
    luggage?: number | null;
    waitHours?: number | null;
    paymentMethod?: string | null;
    paid?: boolean | null;
  }
) {
  ensureDir();
  const issueDateObj = opts?.issueDate ?? new Date();
  const clientSlug = (booking.customer?.fullName ?? booking.user?.name ?? "client")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const invoiceSlug = (opts?.invoiceNumber ?? booking.id).replace(/[^a-z0-9]+/gi, "-");
  const dateSlug = issueDateObj.toISOString().slice(0, 10);
  const siteSlug = (company?.name ?? "taxi-tignieu").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `facture-${dateSlug}-${clientSlug}-${siteSlug}-${invoiceSlug}.pdf`;
  const filePath = path.join(INVOICES_DIR, fileName);

  // Simple one-page PDF (A4)
  const width = 595.28;
  const height = 841.89;
  const margin = 40;
  const headerHeight = 110;
  const primary = hexToRgb(invoicePalette.primary);
  const accent = hexToRgb(invoicePalette.accent);
  const onAccent = hexToRgb(invoicePalette.onAccent);
  const textColor = hexToRgb(invoicePalette.text);
  const muted = hexToRgb(invoicePalette.muted);

  const amountLabel = amountEuros.toFixed(2);
  const clientName = booking.customer?.fullName ?? booking.user?.name ?? booking.userId ?? "Client";
  const clientEmail = booking.customer?.email ?? booking.user?.email ?? "";
  const clientPhone = booking.customer?.phone ?? booking.user?.phone ?? "";
  const invoiceNumber = opts?.invoiceNumber ?? `#${booking.id}`;
  const issueDate = issueDateObj.toLocaleDateString("fr-FR");
  const serviceDate = (opts?.serviceDate ?? booking.dateTime).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const distanceText =
    opts?.distanceKm != null ? `${Math.round(opts.distanceKm * 10) / 10} km` : "—";
  const passengerText = opts?.passengers != null ? String(opts.passengers) : "—";
  const luggageText = opts?.luggage != null ? String(opts.luggage) : "—";
  const waitText = opts?.waitHours != null ? `${opts.waitHours} h` : "0 h";
  const paymentText = opts?.paymentMethod ?? "Non renseigné";
  const paidText = opts?.paid === false ? "Facture non acquittée" : "Facture acquittée";
  const contactLine =
    [company?.phone, company?.email, company?.addressLine].filter(Boolean).join(" · ") ||
    "Service 24/7";

  const top = height - margin;
  const contents = [
    // Header bar
    drawRect(margin, top - headerHeight, width - margin * 2, headerHeight, primary),
    // Logo badge
    drawRect(margin + 18, top - headerHeight + 18, 48, 48, accent),
    drawText("🚕", margin + 30, top - headerHeight + 44, "F2", 16, primary),
    drawText(company?.name ?? "Taxi Tignieu", margin + 78, top - 34, "F2", 20, onAccent),
    drawText("À votre service 24/7", margin + 78, top - 52, "F1", 11, onAccent),
    // phone pill
    drawRect(width - margin - 130, top - 40, 120, 30, accent),
    drawText(contactLine || "06 50 59 78 39", width - margin - 120, top - 22, "F1", 11, primary),
    // Title and meta
    drawText("FACTURE", margin, top - headerHeight - 10, "F2", 18, textColor),
    drawText(
      `N° ${invoiceNumber}`,
      width - margin - 190,
      top - headerHeight - 14,
      "F2",
      12,
      textColor
    ),
    drawText(
      `Émise le ${issueDate}`,
      width - margin - 190,
      top - headerHeight - 30,
      "F1",
      11,
      textColor
    ),
    drawText(
      `Prestation : ${serviceDate}`,
      width - margin - 190,
      top - headerHeight - 46,
      "F1",
      11,
      textColor
    ),
    // Seller block
    drawText(
      company?.name ?? "Taxi Tignieu",
      margin,
      top - headerHeight - 28,
      "F2",
      12.5,
      textColor
    ),
    drawText(company?.addressLine ?? "", margin, top - headerHeight - 42, "F1", 11, textColor),
    drawText(contactLine, margin, top - headerHeight - 56, "F1", 11, muted),
    drawText(
      `SIRET : ${company?.siret ?? "—"} • APE : ${company?.ape ?? "—"}`,
      margin,
      top - headerHeight - 70,
      "F1",
      10.5,
      muted
    ),
    // Client block
    drawRect(margin, top - headerHeight - 160, (width - margin * 2) / 2 - 6, 100, accent),
    drawText("Facturé à", margin + 12, top - headerHeight - 122, "F2", 11.5, primary),
    drawText(clientName, margin + 12, top - headerHeight - 138, "F2", 12.5, primary),
    drawText(clientEmail || "—", margin + 12, top - headerHeight - 154, "F1", 10.5, onAccent),
    drawText(clientPhone || "—", margin + 12, top - headerHeight - 170, "F1", 10.5, onAccent),
    // Trip box
    drawRect(
      margin + (width - margin * 2) / 2 + 6,
      top - headerHeight - 160,
      (width - margin * 2) / 2 - 6,
      100,
      primary
    ),
    drawText(
      "Détails course",
      margin + (width - margin * 2) / 2 + 18,
      top - headerHeight - 122,
      "F2",
      11.5,
      onAccent
    ),
    drawText(
      `Départ: ${formatAddress(booking.pickup)}`,
      margin + (width - margin * 2) / 2 + 18,
      top - headerHeight - 138,
      "F1",
      10.5,
      onAccent
    ),
    drawText(
      `Arrivée: ${formatAddress(booking.dropoff)}`,
      margin + (width - margin * 2) / 2 + 18,
      top - headerHeight - 154,
      "F1",
      10.5,
      onAccent
    ),
    drawText(
      `Distance: ${distanceText} • Passagers: ${passengerText} • Bagages: ${luggageText} • Attente: ${waitText}`,
      margin + (width - margin * 2) / 2 + 18,
      top - headerHeight - 170,
      "F1",
      10.5,
      onAccent
    ),
    // Amount box
    drawRect(margin, top - headerHeight - 240, width - margin * 2, 60, accent),
    drawText("Total TTC", margin + 14, top - headerHeight - 208, "F2", 13, primary),
    drawText(`${amountLabel} €`, width - margin - 120, top - headerHeight - 208, "F2", 16, primary),
    // Paid bar
    drawRect(
      margin,
      top - headerHeight - 286,
      width - margin * 2,
      38,
      paidText.includes("non") ? { r: 1, g: 0.91, b: 0.91 } : { r: 0.91, g: 0.97, b: 0.93 }
    ),
    drawText(
      paidText,
      margin + 14,
      top - headerHeight - 262,
      "F2",
      11.5,
      paidText.includes("non") ? { r: 0.72, g: 0.16, b: 0.16 } : { r: 0.1, g: 0.5, b: 0.2 }
    ),
    drawText(
      `Paiement : ${paymentText}`,
      width - margin - 200,
      top - headerHeight - 262,
      "F1",
      11,
      textColor
    ),
    // Footer
    drawText(
      "Prestation de transport de personnes. Tarifs réglementés. Merci pour votre confiance.",
      margin,
      margin + 22,
      "F1",
      10.5,
      muted
    ),
    drawText(
      (company?.name ?? "Taxi Tignieu") +
        " • " +
        (company?.addressLine ?? "") +
        " • " +
        (company?.email ?? ""),
      margin,
      margin + 10,
      "F1",
      10.5,
      muted
    ),
  ].join("");

  const contentStream = `q\n${contents}Q\n`;
  const contentLength = Buffer.byteLength(contentStream);

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`
  );
  objects.push(
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj`
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  objects.push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  let offset = 0;
  let pdf = "%PDF-1.4\n";
  offset += pdf.length;
  const xref: number[] = [0];
  for (const obj of objects) {
    xref.push(offset);
    pdf += obj + "\n";
    offset += obj.length + 1;
  }
  const xrefStart = offset;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < xref.length; i++) {
    pdf += `${xref[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  await fs.promises.writeFile(filePath, pdf, "utf8");

  return { fileName, filePath };
}

export function getInvoicePublicPath(fileName: string) {
  return `/invoices/${fileName}`;
}
