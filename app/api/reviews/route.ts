import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(500),
  bookingId: z.number().optional(),
});

export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
    },
    take: 30,
  });
  return NextResponse.json({ reviews }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { rating, comment, bookingId } = parsed.data;

  const existing = await prisma.review.findFirst({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({ error: "Vous avez déjà déposé un avis." }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      status: "PENDING",
      userId: session.user.id,
      bookingId: bookingId ?? null,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}

const patchSchema = reviewSchema.partial().extend({
  id: z.number(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

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

  const existing = await prisma.review.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const managerList =
    process.env.MANAGER_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (session.user.email && adminList.includes(session.user.email.toLowerCase()));
  const isManager =
    Boolean(session.user.isManager) ||
    (session.user.email && managerList.includes(session.user.email.toLowerCase()));
  const isOwner = existing.userId === session.user.id;

  if (!isOwner && !isAdmin && !isManager) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.rating !== undefined) data.rating = parsed.data.rating;
  if (parsed.data.comment !== undefined) data.comment = parsed.data.comment;
  if (parsed.data.status !== undefined) {
    if (isAdmin || isManager) {
      data.status = parsed.data.status;
    }
  }

  const review = await prisma.review.update({
    where: { id: parsed.data.id },
    data,
  });

  return NextResponse.json({ review }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const managerList =
    process.env.MANAGER_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (session.user.email && adminList.includes(session.user.email.toLowerCase()));
  const isManager =
    Boolean(session.user.isManager) ||
    (session.user.email && managerList.includes(session.user.email.toLowerCase()));
  const isOwner = existing.userId === session.user.id;

  if (!isOwner && !isAdmin && !isManager) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
