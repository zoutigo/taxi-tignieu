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
  categoryId: z.number(),
  slug: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(4000),
  position: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.number(),
  slug: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  position: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
  categoryId: z.number().optional(),
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
    const service = await prisma.service.create({
      data: {
        categoryId: parsed.data.categoryId,
        slug: parsed.data.slug,
        title: parsed.data.title,
        description: parsed.data.description,
        position: parsed.data.position ?? 0,
        isEnabled: parsed.data.isEnabled ?? true,
      },
      include: {
        highlights: { orderBy: { position: "asc" } },
        category: { select: { slug: true } },
      },
    });
    revalidateAll(service.category?.slug);
    return NextResponse.json({ service }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de créer le service" }, { status: 500 });
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
    const service = await prisma.service.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        position: data.position ?? undefined,
        isEnabled: data.isEnabled ?? undefined,
        categoryId: data.categoryId ?? undefined,
      },
      include: {
        highlights: { orderBy: { position: "asc" } },
        category: { select: { slug: true } },
      },
    });
    revalidateAll(service.category?.slug);
    return NextResponse.json({ service }, { status: 200 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de mettre à jour le service" }, { status: 500 });
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
  const service = await prisma.service.findUnique({
    where: { id },
    select: { id: true, category: { select: { slug: true } } },
  });
  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }
  await prisma.service.delete({ where: { id } });
  revalidateAll(service.category?.slug);
  return NextResponse.json({ ok: true }, { status: 200 });
}
