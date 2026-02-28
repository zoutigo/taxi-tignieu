import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

export async function GET() {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isAdmin: true,
      isManager: true,
      isDriver: true,
      isActive: true,
      bookings: {
        select: {
          id: true,
          pickup: true,
          dropoff: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ users }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, isAdmin, isManager, isDriver, isActive } = body ?? {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const requesterId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (requesterId && requesterId === id && isActive === false) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous désactiver vous-même." },
      { status: 409 }
    );
  }

  const data: {
    isAdmin?: boolean;
    isManager?: boolean;
    isDriver?: boolean;
    isActive?: boolean;
  } = {};
  if (typeof isAdmin === "boolean") data.isAdmin = isAdmin;
  if (typeof isManager === "boolean") data.isManager = isManager;
  if (typeof isDriver === "boolean") data.isDriver = isDriver;
  if (typeof isActive === "boolean") data.isActive = isActive;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data,
      select: { id: true, isAdmin: true, isManager: true, isDriver: true, isActive: true },
    });

    if (typeof isActive === "boolean" && !isActive) {
      await tx.booking.updateMany({
        where: { driverId: id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { driverId: null },
      });
    }

    return updated;
  });

  return NextResponse.json({ user }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body ?? {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const requesterId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (requesterId && requesterId === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 409 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { driverId: id, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { driverId: null },
    });
    await tx.user.update({ where: { id }, data: { isActive: false } });
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
