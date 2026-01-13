import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amountEuros: z.number().positive().optional(),
  issuedAt: z.string().datetime().optional(),
  pdfPath: z.string().min(1).optional().nullable(),
  realKm: z.number().optional(),
  realLuggage: z.number().optional(),
  realPax: z.number().optional(),
  waitHours: z.number().optional(),
  sendToClient: z.boolean().optional(),
  adjustmentComment: z.string().optional().nullable(),
  paid: z.boolean().optional(),
  paymentMethod: z.enum(["CB", "CASH", "PAYPAL", "BTC"]).optional(),
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
  const {
    amountEuros,
    issuedAt,
    pdfPath,
    realKm,
    realLuggage,
    realPax,
    waitHours,
    sendToClient,
    adjustmentComment,
    paid,
    paymentMethod,
  } = parse.data;

  const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      amount: amountEuros ?? existing.amount,
      issuedAt: issuedAt ? new Date(issuedAt) : existing.issuedAt,
      pdfPath: pdfPath ?? existing.pdfPath,
      realKm: realKm ?? existing.realKm,
      realLuggage: realLuggage ?? existing.realLuggage,
      realPax: realPax ?? existing.realPax,
      waitHours: waitHours ?? existing.waitHours,
      sendToClient: sendToClient ?? existing.sendToClient,
      adjustmentComment: adjustmentComment ?? existing.adjustmentComment,
      paid: paid ?? existing.paid,
      paymentMethod: paymentMethod ?? existing.paymentMethod,
    },
    include: {
      booking: { include: { user: true, customer: true } },
    },
  });

  return NextResponse.json(updated);
}
