import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bookingEstimateSchema } from "@/schemas/booking";
import { z } from "zod";

const patchSchema = bookingEstimateSchema
  .partial()
  .extend({
    id: z.union([z.string(), z.number()]),
  })
  .required({ id: true });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bookingEstimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { pickup, dropoff, date, time, passengers, luggage, notes } = parsed.data;
  const dateTime = new Date(`${date}T${time}`);
  const priceCents =
    typeof body.estimatedPrice === "number" && Number.isFinite(body.estimatedPrice)
      ? Math.round(body.estimatedPrice * 100)
      : null;

  try {
    const booking = await prisma.booking.create({
      data: {
        pickup,
        dropoff,
        dateTime,
        pax: passengers,
        luggage,
        notes: notes || null,
        priceCents,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { id, pickup, dropoff, date, time, passengers, luggage, notes } = parsed.data;
  const bookingId = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  const isOwner = existing?.userId === session.user.id;
  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (session.user.email && adminList.includes(session.user.email.toLowerCase()));

  if (!existing || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (pickup) data.pickup = pickup;
  if (dropoff) data.dropoff = dropoff;
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (typeof passengers === "number") data.pax = passengers;
  if (typeof luggage === "number") data.luggage = luggage;
  if (notes !== undefined) data.notes = notes || null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data,
  });

  return NextResponse.json({ booking }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const bookingId = typeof body?.id === "number" ? body.id : Number(body?.id);
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  const isOwner = existing?.userId === session.user.id;
  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (session.user.email && adminList.includes(session.user.email.toLowerCase()));

  if (!existing || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  await prisma.booking.delete({ where: { id: bookingId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
