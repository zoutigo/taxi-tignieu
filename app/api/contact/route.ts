import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  category: z.string().min(1),
  subject: z.string().min(2),
  message: z.string().min(5),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const { category, subject, message } = parsed.data;

  const contactDelegate = (
    prisma as unknown as {
      contactMessage?: {
        create: (args: {
          data: { userId: string; category: string; subject: string; message: string };
        }) => Promise<unknown>;
      };
    }
  ).contactMessage;

  if (!contactDelegate) {
    return NextResponse.json({ error: "contactMessage non configuré" }, { status: 500 });
  }

  const created = (await contactDelegate.create({
    data: {
      userId: session.user.id,
      category,
      subject,
      message,
    },
  })) as { id: number };

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
