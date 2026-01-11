import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

const patchSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(1).max(500).optional(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  })
  .required({ id: true });

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
  const reviewId = String(id);

  const data: Record<string, unknown> = {};
  if (rating !== undefined) data.rating = rating;
  if (comment !== undefined) data.comment = comment;
  if (status !== undefined) data.status = status;

  const review = await prisma.review.update({
    where: { id: reviewId },
    data,
  });
  // revalidation est ignorée en test; en prod, Next la gère via tags/ISR
  try {
    revalidatePath("/");
    revalidatePath("/avis");
  } catch {
    // ignore in tests
  }
  return NextResponse.json({ review }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" || typeof body?.id === "number" ? String(body.id) : null;
  if (!id) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  await prisma.review.delete({ where: { id } });
  try {
    revalidatePath("/");
    revalidatePath("/avis");
  } catch {
    // ignore in tests
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
