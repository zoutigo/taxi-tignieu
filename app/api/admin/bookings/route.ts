import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

const updateSchema = z.object({
  id: z.number(),
  pickup: z.string().optional(),
  dropoff: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  passengers: z.number().optional(),
  luggage: z.number().optional(),
  babySeat: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  priceCents: z.number().int().optional(),
});

export async function GET() {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const {
    id,
    pickup,
    dropoff,
    date,
    time,
    passengers,
    luggage,
    babySeat,
    notes,
    status,
    priceCents,
  } = parsed.data;

  const data: Record<string, unknown> = {};
  if (pickup !== undefined) data.pickup = pickup;
  if (dropoff !== undefined) data.dropoff = dropoff;
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (passengers !== undefined) data.pax = passengers;
  if (luggage !== undefined) data.luggage = luggage;
  if (babySeat !== undefined) data.babySeat = babySeat;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) data.status = status;
  if (priceCents !== undefined) data.priceCents = priceCents;

  const booking = await prisma.booking.update({
    where: { id },
    data,
  });

  return NextResponse.json({ booking }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
