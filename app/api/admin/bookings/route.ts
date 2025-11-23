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
  driverId: z.union([z.string(), z.null()]).optional(),
});

export async function GET() {
  const session = await auth();
  const isDriver = Boolean((session as { user?: { isDriver?: boolean } } | null)?.user?.isDriver);
  if (!isAdminLike(session) && !isDriver) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
    } as unknown as NonNullable<Parameters<typeof prisma.booking.findMany>[0]>["include"],
  });

  return NextResponse.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const user = (
    session as {
      user?: { id?: string; isDriver?: boolean; isAdmin?: boolean; isManager?: boolean };
    } | null
  )?.user;
  const adminLike = isAdminLike(session);
  const isDriver = Boolean(user?.isDriver);
  if (!adminLike && !isDriver) {
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
    driverId,
  } = parsed.data;

  const existing = (await prisma.booking.findUnique({
    where: { id },
    select: { driverId: true },
  } as unknown as NonNullable<Parameters<typeof prisma.booking.findUnique>[0]>)) as {
    driverId: string | null;
  } | null;
  if (!existing) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  if (!adminLike) {
    const providedKeys = Object.keys(parsed.data).filter((k) => k !== "id");
    const allowedForDriver = ["status", "driverId"];
    if (providedKeys.some((k) => !allowedForDriver.includes(k))) {
      return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
    }
    if (driverId !== undefined) {
      const isRelease = driverId === null;
      const isClaim = driverId === user?.id;
      const isTransfer = !isRelease && !isClaim;

      if (isRelease && existing.driverId && existing.driverId !== user?.id) {
        return NextResponse.json(
          { error: "Réservation déjà assignée à un autre chauffeur." },
          { status: 409 }
        );
      }
      if ((isClaim || isTransfer) && existing.driverId && existing.driverId !== user?.id) {
        return NextResponse.json({ error: "Réservation déjà prise." }, { status: 409 });
      }

      if ((isClaim || isTransfer) && driverId) {
        const target = await prisma.user.findUnique({
          where: { id: driverId },
          select: { isDriver: true },
        });
        if (!target?.isDriver) {
          return NextResponse.json({ error: "Le chauffeur cible est invalide." }, { status: 400 });
        }
      }
    }
  }

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
  if (driverId !== undefined) data.driverId = driverId;

  const booking = await prisma.booking.update({
    where: { id },
    data,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
    } as unknown as NonNullable<Parameters<typeof prisma.booking.update>[0]>["include"],
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
