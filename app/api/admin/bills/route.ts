import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/billing";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const bookingId = typeof body?.bookingId === "number" ? body.bookingId : Number(body?.bookingId);
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: "bookingId requis" }, { status: 400 });
  }

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

  const amountCents = booking.priceCents ?? 0;
  const siteConfig = await prisma.siteConfig.findFirst({ include: { address: true } });
  const company = siteConfig
    ? {
        name: "Taxi Tignieu",
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

  const bill = await prisma.invoice.upsert({
    where: { bookingId },
    update: { amountCents, pdfPath: filePath, updatedAt: new Date() },
    create: { bookingId, amountCents, pdfPath: filePath },
  });

  return NextResponse.json({ bill, download: fileName }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const bills = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { pickup: true, dropoff: true, user: true } } },
  });
  return NextResponse.json({ bills });
}
export const runtime = "nodejs";
