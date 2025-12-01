import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bookingEstimateSchema } from "@/schemas/booking";
import { z } from "zod";

const patchSchema = bookingEstimateSchema
  .partial()
  .extend({
    id: z.union([z.string(), z.number()]),
    estimatedPrice: z.number().optional(),
  })
  .required({ id: true });

const createAddressData = (addr: z.infer<typeof bookingEstimateSchema>["pickup"]) => ({
  name: addr.name ?? null,
  street: addr.street ?? null,
  streetNumber: addr.streetNumber ?? null,
  postalCode: addr.postcode ?? null,
  city: addr.city ?? null,
  country: addr.country ?? null,
  latitude: addr.lat,
  longitude: addr.lng,
});

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
    const pickupAddress = await prisma.address.create({ data: createAddressData(pickup) });
    const dropoffAddress = await prisma.address.create({ data: createAddressData(dropoff) });

    const booking = await prisma.booking.create({
      data: {
        pickupId: pickupAddress.id,
        dropoffId: dropoffAddress.id,
        dateTime,
        pax: passengers,
        luggage,
        notes: notes || null,
        priceCents,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { booking: { ...booking, pickup: pickupAddress, dropoff: dropoffAddress } },
      { status: 201 }
    );
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
    include: { pickup: true, dropoff: true },
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

  const { id, pickup, dropoff, date, time, passengers, luggage, notes, estimatedPrice } =
    parsed.data;
  const bookingId = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { pickup: true, dropoff: true },
  });
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
  if (pickup) {
    const pickupAddress = await prisma.address.create({ data: createAddressData(pickup) });
    data.pickupId = pickupAddress.id;
  }
  if (dropoff) {
    const dropoffAddress = await prisma.address.create({ data: createAddressData(dropoff) });
    data.dropoffId = dropoffAddress.id;
  }
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (typeof passengers === "number") data.pax = passengers;
  if (typeof luggage === "number") data.luggage = luggage;
  if (notes !== undefined) data.notes = notes || null;
  if (typeof estimatedPrice === "number" && Number.isFinite(estimatedPrice)) {
    data.priceCents = Math.round(estimatedPrice * 100);
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data,
    include: { pickup: true, dropoff: true },
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
