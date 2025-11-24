import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidAvatar } from "@/lib/avatars";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const avatar = typeof body?.avatar === "string" ? body.avatar : "";

  if (!isValidAvatar(avatar)) {
    return NextResponse.json({ error: "Avatar invalide" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image: avatar },
    select: { id: true, image: true },
  });

  return NextResponse.json({ user }, { status: 200 });
}
