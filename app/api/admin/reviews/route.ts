import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

const patchSchema = z.object({
  id: z.number(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).max(500).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ reviews }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { id, rating, comment, status } = parsed.data;

  const data: Record<string, unknown> = {};
  if (rating !== undefined) data.rating = rating;
  if (comment !== undefined) data.comment = comment;
  if (status !== undefined) data.status = status;

  const review = await prisma.review.update({
    where: { id },
    data,
  });
  return NextResponse.json({ review }, { status: 200 });
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
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
