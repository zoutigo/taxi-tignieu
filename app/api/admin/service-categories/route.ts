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
  slug: z.string().trim().min(2).max(50),
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(2).max(500),
  position: z.number().int().min(0).optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.number(),
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

export async function GET() {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const categories = await prisma.sCategory.findMany({
    orderBy: { position: "asc" },
    include: {
      services: {
        orderBy: { position: "asc" },
        include: { highlights: { orderBy: { position: "asc" } } },
      },
    },
  });
  return NextResponse.json({ categories }, { status: 200 });
}

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
    const category = await prisma.sCategory.create({
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        summary: parsed.data.summary,
        position: parsed.data.position ?? 0,
      },
    });
    revalidateAll(category.slug);
    return NextResponse.json({ category: { ...category, services: [] } }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de créer la catégorie" }, { status: 500 });
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
    const category = await prisma.sCategory.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        position: data.position ?? undefined,
      },
    });
    revalidateAll(category.slug);
    return NextResponse.json({ category }, { status: 200 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Impossible de mettre à jour la catégorie" },
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
  const cat = await prisma.sCategory.findUnique({ where: { id }, select: { slug: true } });
  if (!cat) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  }
  await prisma.sCategory.delete({ where: { id } });
  revalidateAll(cat.slug);
  return NextResponse.json({ ok: true }, { status: 200 });
}
