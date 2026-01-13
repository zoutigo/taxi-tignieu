import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amountEuros: z.number().positive(),
  issuedAt: z.string().datetime(),
  pdfPath: z.string().min(1).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parse.error.flatten() },
      { status: 400 }
    );
  }
  const { amountEuros, issuedAt, pdfPath } = parse.data;

  const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      amountCents: Math.round(amountEuros * 100),
      issuedAt: new Date(issuedAt),
      pdfPath: pdfPath ?? existing.pdfPath,
    },
    include: {
      booking: { include: { user: true, customer: true } },
    },
  });

  return NextResponse.json(updated);
}
