/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { featuredTripSchema } from "@/lib/validation/featured-trip";
import { z } from "zod";
import { slugify } from "@/lib/slugify";

const adminOnly = async () => {
  const session = await auth();
  const isAdminLike = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  if (!isAdminLike) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  return null;
};

export async function GET() {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;

  const trips = await prisma.featuredTrip.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: { pickupAddress: true, dropoffAddress: true, poiDestinations: true },
  });
  return NextResponse.json({ trips }, { status: 200 });
}

export async function POST(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = await featuredTripSchema.omit({ id: true }).safeParseAsync(body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    const message = first?.message ?? "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { poiDestinations = [], ...data } = parsed.data;
  const normalizedSlug = slugify(data.slug);

  const exists = await prisma.featuredTrip.findFirst({ where: { slug: normalizedSlug } });
  if (exists) {
    return NextResponse.json({ error: "Ce slug existe déjà", field: "slug" }, { status: 409 });
  }

  const created = await prisma.featuredTrip.create({
    data: {
      ...data,
      slug: normalizedSlug,
      poiDestinations: {
        create: poiDestinations.map((p, idx) => ({
          ...p,
          order: p.order ?? idx,
        })),
      },
    },
    include: { poiDestinations: true, pickupAddress: true, dropoffAddress: true },
  });
  return NextResponse.json({ trip: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = await featuredTripSchema.extend({ id: z.string().uuid() }).safeParseAsync(body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    const message = first?.message ?? "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { id, poiDestinations = [], ...data } = parsed.data;
  const normalizedSlug = slugify(data.slug);

  const exists = await prisma.featuredTrip.findFirst({
    where: { slug: normalizedSlug, NOT: { id } },
  });
  if (exists) {
    return NextResponse.json({ error: "Ce slug existe déjà", field: "slug" }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.featuredPoi.deleteMany({ where: { tripId: id } });
    await tx.featuredTrip.update({
      where: { id },
      data: { ...data, slug: normalizedSlug },
    });
    await tx.featuredPoi.createMany({
      data: poiDestinations.map((p, idx) => ({
        ...p,
        order: p.order ?? idx,
        tripId: id,
      })),
    });
    return tx.featuredTrip.findUnique({
      where: { id },
      include: { pickupAddress: true, dropoffAddress: true, poiDestinations: true },
    });
  });
  return NextResponse.json({ trip: updated }, { status: 200 });
}

export async function DELETE(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.featuredPoi.deleteMany({ where: { tripId: id } });
      await tx.featuredTrip.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Suppression impossible : des données liées référencent ce trajet." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
