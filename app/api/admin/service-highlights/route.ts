import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

const createSchema = z.object({
  serviceId: z.number(),
  label: z.string().trim().min(2).max(200),
  position: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  id: z.number(),
  label: z.string().trim().min(2).max(200).optional(),
  position: z.number().int().min(0).optional(),
});

const revalidateAll = (slug?: string | null) => {
  try {
    revalidatePath("/services");
    if (slug) {
      revalidatePath(`/services/${slug}`);
    }
  } catch {
    // ignore in tests
  }
};

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  try {
    const highlight = await prisma.sHighlight.create({
      data: {
        serviceId: parsed.data.serviceId,
        label: parsed.data.label,
        position: parsed.data.position ?? 0,
      },
      include: {
        service: {
          select: { id: true, category: { select: { slug: true } } },
        },
      },
    });
    revalidateAll(highlight.service?.category?.slug);
    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/admin/service-highlights failed", error);
    return NextResponse.json({ error: "Impossible de créer le highlight" }, { status: 500 });
  }
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
  const { id, ...data } = parsed.data;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }
  try {
    const highlight = await prisma.sHighlight.update({
      where: { id },
      data: {
        label: data.label,
        position: data.position ?? undefined,
      },
      include: {
        service: { select: { id: true, category: { select: { slug: true } } } },
      },
    });
    revalidateAll(highlight.service?.category?.slug);
    return NextResponse.json({ highlight }, { status: 200 });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/service-highlights failed", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le highlight" },
      { status: 500 }
    );
  }
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
  const highlight = await prisma.sHighlight.findUnique({
    where: { id },
    select: { id: true, service: { select: { category: { select: { slug: true } } } } },
  });
  if (!highlight) {
    return NextResponse.json({ error: "Highlight introuvable" }, { status: 404 });
  }
  await prisma.sHighlight.delete({ where: { id } });
  revalidateAll(highlight.service?.category?.slug);
  return NextResponse.json({ ok: true }, { status: 200 });
}
