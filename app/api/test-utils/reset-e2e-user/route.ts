import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const e2eUserId = process.env.AUTH_E2E_TEST_USER_ID;

export async function POST() {
  if (!e2eUserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = process.env.AUTH_E2E_TEST_USER_EMAIL ?? "e2e@example.com";
  const name = process.env.AUTH_E2E_TEST_USER_NAME ?? "Utilisateur E2E";

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingByEmail && existingByEmail.id !== e2eUserId) {
    await prisma.user.delete({
      where: { email },
    });
  }

  await prisma.user.upsert({
    where: { id: e2eUserId },
    update: {
      email,
      name,
      phone: null,
    },
    create: {
      id: e2eUserId,
      email,
      name,
      phone: null,
    },
  });

  return NextResponse.json({ ok: true });
}
