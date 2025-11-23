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
  const { id, isAdmin, isManager, isDriver } = body ?? {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      isAdmin: Boolean(isAdmin),
      isManager: Boolean(isManager),
      isDriver: Boolean(isDriver),
    },
    select: { id: true, isAdmin: true, isManager: true, isDriver: true },
  });

  return NextResponse.json({ user }, { status: 200 });
}
