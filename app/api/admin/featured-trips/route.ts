import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { featuredTripSchema } from "@/lib/validation/featured-trip";
import { z } from "zod";

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
    include: { pickupAddress: true, dropoffAddress: true },
  });
  return NextResponse.json({ trips }, { status: 200 });
}

export async function POST(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = await featuredTripSchema.omit({ id: true }).safeParseAsync(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data;

  const exists = await prisma.featuredTrip.findFirst({ where: { slug: data.slug } });
  if (exists) {
    return NextResponse.json({ error: "Ce slug existe déjà", field: "slug" }, { status: 409 });
  }

  const created = await prisma.featuredTrip.create({ data });
  return NextResponse.json({ trip: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = await featuredTripSchema.extend({ id: z.string().uuid() }).safeParseAsync(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { id, ...data } = parsed.data;

  const exists = await prisma.featuredTrip.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (exists) {
    return NextResponse.json({ error: "Ce slug existe déjà", field: "slug" }, { status: 409 });
  }

  const updated = await prisma.featuredTrip.update({
    where: { id },
    data,
  });
  return NextResponse.json({ trip: updated }, { status: 200 });
}

export async function DELETE(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.featuredTrip.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
