import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Address, SiteConfig } from "@prisma/client";
import { generateInvoicePdf } from "@/lib/billing";
import { z } from "zod";

const createSchema = z.object({
  bookingId: z.string().min(1),
  amountEuros: z.number().positive().optional(),
  realKm: z.number().optional(),
  realLuggage: z.number().optional(),
  realPax: z.number().optional(),
  waitHours: z.number().optional(),
  adjustmentComment: z.string().optional(),
  paid: z.boolean().optional(),
  paymentMethod: z.enum(["CB", "CASH", "PAYPAL", "BTC"]).optional(),
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
  const {
    bookingId,
    amountEuros,
    issuedAt,
    sendToClient,
    realKm,
    realLuggage,
    realPax,
    waitHours,
    adjustmentComment,
    paid,
    paymentMethod,
  } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { pickup: true, dropoff: true, user: true, customer: true },
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

  const amount =
    amountEuros != null ? amountEuros : booking.priceCents != null ? booking.priceCents / 100 : 0;
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
        siret: siteConfig.siret,
        ape: siteConfig.ape,
      }
    : { name: "Taxi Tignieu" };

  const { fileName, filePath } = await generateInvoicePdf(booking, amount, company, {
    invoiceNumber: bookingId,
    issueDate: issuedAtValue,
    serviceDate: booking.dateTime,
    distanceKm: realKm ?? undefined,
    passengers: realPax ?? booking.pax,
    luggage: realLuggage ?? booking.luggage,
    waitHours: waitHours ?? undefined,
    paymentMethod,
    paid: paid ?? true,
  });

  const invoice = await prisma.invoice.upsert({
    where: { bookingId },
    update: {
      amount,
      pdfPath: filePath,
      issuedAt: issuedAtValue,
      updatedAt: new Date(),
      realKm: realKm ?? null,
      realLuggage: realLuggage ?? null,
      realPax: realPax ?? null,
      waitHours: waitHours ?? 0,
      adjustmentComment: adjustmentComment ?? null,
      sendToClient: sendToClient ?? true,
      paid: paid ?? true,
      paymentMethod: paymentMethod ?? "CB",
    },
    create: {
      bookingId,
      amount,
      pdfPath: filePath,
      issuedAt: issuedAtValue,
      realKm: realKm ?? null,
      realLuggage: realLuggage ?? null,
      realPax: realPax ?? null,
      waitHours: waitHours ?? 0,
      adjustmentComment: adjustmentComment ?? null,
      sendToClient: sendToClient ?? true,
      paid: paid ?? true,
      paymentMethod: paymentMethod ?? "CB",
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
