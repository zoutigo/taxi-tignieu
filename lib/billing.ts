import fs from "fs";
import path from "path";
import type { Booking, Address, User } from "@prisma/client";
import { invoicePalette } from "../pdf-template/invoice-template";

export type BookingWithRelations = Booking & {
  pickup: Address | null;
  dropoff: Address | null;
  user?: User | null;
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
  amountCents: number,
  company?: CompanyInfo
) {
  ensureDir();
  const fileName = `facture-${booking.id}-${Date.now()}.pdf`;
  const filePath = path.join(INVOICES_DIR, fileName);

  // Simple one-page PDF (A4)
  const width = 595.28;
  const height = 841.89;
  const margin = 40;
  const headerHeight = 90;
  const primary = hexToRgb(invoicePalette.primary);
  const accent = hexToRgb(invoicePalette.accent);
  const onAccent = hexToRgb(invoicePalette.onAccent);
  const textColor = hexToRgb(invoicePalette.text);
  const muted = hexToRgb(invoicePalette.muted);

  const amountEuros = (amountCents / 100).toFixed(2);
  const clientName = booking.user?.name ?? booking.userId ?? "Client";
  const clientEmail = booking.user?.email ?? "";
  const contactLine =
    [company?.phone, company?.email, company?.addressLine].filter(Boolean).join(" · ") ||
    "Service 24/7";

  const contents = [
    // Header bar
    drawRect(margin, height - margin - headerHeight, width - margin * 2, headerHeight, primary),
    // Logo badge (approximation)
    drawRect(margin + 16, height - margin - headerHeight + 16, 50, 50, accent),
    drawText("Taxi", margin + 24, height - margin - headerHeight + 46, "F2", 14, onAccent),
    drawText("Tignieu", margin + 24, height - margin - headerHeight + 30, "F2", 14, onAccent),
    // Brand title
    drawText(
      company?.name ?? "Taxi Tignieu",
      margin + 76,
      height - margin - 36,
      "F2",
      22,
      onAccent
    ),
    drawText("À votre service 24/7", margin + 76, height - margin - 54, "F1", 12, onAccent),
    // Invoice label + reservation number (right side, outside header)
    drawText("Facture", width - margin - 120, height - margin - 30, "F1", 13, onAccent),
    drawText(
      `Réservation #${booking.id}`,
      width - margin - 160,
      height - margin - 48,
      "F1",
      11,
      onAccent
    ),
    // Contact line
    drawText(contactLine, margin, height - margin - headerHeight - 24, "F1", 11, textColor),
    // Client block
    drawText("Client", margin, height - margin - headerHeight - 60, "F1", 11, textColor),
    drawText(clientName, margin, height - margin - headerHeight - 78, "F2", 13, textColor),
    drawText(clientEmail, margin, height - margin - headerHeight - 94, "F1", 11, textColor),
    // Trip info
    drawText("Départ", margin, height - margin - headerHeight - 126, "F1", 11, textColor),
    drawText(
      formatAddress(booking.pickup),
      margin,
      height - margin - headerHeight - 142,
      "F1",
      11,
      textColor
    ),
    drawText("Arrivée", margin, height - margin - headerHeight - 172, "F1", 11, textColor),
    drawText(
      formatAddress(booking.dropoff),
      margin,
      height - margin - headerHeight - 188,
      "F1",
      11,
      textColor
    ),
    drawText("Date/heure", margin, height - margin - headerHeight - 218, "F1", 11, textColor),
    drawText(
      new Date(booking.dateTime).toLocaleString("fr-FR"),
      margin,
      height - margin - headerHeight - 234,
      "F1",
      11,
      textColor
    ),
    // Amount box
    drawRect(width - margin - 150, height - margin - headerHeight - 120, 150, 70, accent),
    drawText(
      `${amountEuros} €`,
      width - margin - 135,
      height - margin - headerHeight - 80,
      "F2",
      18,
      onAccent
    ),
    drawText(
      "Service 24/7",
      width - margin - 135,
      height - margin - headerHeight - 98,
      "F1",
      11,
      onAccent
    ),
    // Footer
    drawText(contactLine, margin, margin + 10, "F1", 10, muted),
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
