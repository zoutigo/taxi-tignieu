import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Address, SiteConfig } from "@prisma/client";
import { generateInvoicePdf } from "@/lib/billing";
import { z } from "zod";

const createSchema = z.object({
  bookingId: z.string().min(1),
  amountEuros: z.number().positive().optional(),
  issuedAt: z.string().datetime().optional(),
  sendToClient: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { bookingId, amountEuros, issuedAt } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { pickup: true, dropoff: true, user: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Facturation réservée aux courses terminées." },
      { status: 400 }
    );
  }

  const amountCents =
    amountEuros != null ? Math.round(amountEuros * 100) : (booking.priceCents ?? 0);
  const issuedAtValue = issuedAt ? new Date(issuedAt) : new Date();

  const siteConfig = (await prisma.siteConfig.findFirst({
    include: { address: true },
  })) as (SiteConfig & { address: Address }) | null;
  const company = siteConfig
    ? {
        name: siteConfig.name ?? "Taxi Tignieu",
        phone: siteConfig.phone ?? "",
        email: siteConfig.email ?? "",
        addressLine: siteConfig.address
          ? `${siteConfig.address.streetNumber ?? ""} ${siteConfig.address.street ?? ""} ${
              siteConfig.address.postalCode ?? ""
            } ${siteConfig.address.city ?? ""}`.trim()
          : "",
      }
    : { name: "Taxi Tignieu" };

  const { fileName, filePath } = await generateInvoicePdf(booking, amountCents, company);

  const invoice = await prisma.invoice.upsert({
    where: { bookingId },
    update: {
      amountCents,
      pdfPath: filePath,
      issuedAt: issuedAtValue,
      updatedAt: new Date(),
    },
    create: {
      bookingId,
      amountCents,
      pdfPath: filePath,
      issuedAt: issuedAtValue,
    },
  });

  return NextResponse.json({ invoice, download: fileName }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { user: true, customer: true } } },
  });
  return NextResponse.json({ invoices });
}

export const runtime = "nodejs";
