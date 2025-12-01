import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { defaultTariffConfig } from "@/lib/tarifs";

const payloadSchema = z.object({
  baseCharge: z.number().nonnegative(),
  kmA: z.number().nonnegative(),
  kmB: z.number().nonnegative(),
  kmC: z.number().nonnegative(),
  kmD: z.number().nonnegative(),
  waitPerHour: z.number().nonnegative(),
  baggageFee: z.number().nonnegative(),
  fifthPassenger: z.number().nonnegative(),
});

const toCents = (value: number) => Math.round(value * 100);

const isAdminLike = (session: unknown): boolean =>
  Boolean((session as { user?: { isAdmin?: boolean; isManager?: boolean } })?.user?.isAdmin) ||
  Boolean((session as { user?: { isManager?: boolean } })?.user?.isManager);

export async function GET() {
  const config = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const fallback = defaultTariffConfig;

  const payload = config
    ? {
        baseCharge: config.baseChargeCents / 100,
        kmA: config.kmCentsA / 100,
        kmB: config.kmCentsB / 100,
        kmC: config.kmCentsC / 100,
        kmD: config.kmCentsD / 100,
        waitPerHour: config.waitPerHourCents / 100,
        baggageFee: config.baggageFeeCents / 100,
        fifthPassenger: config.fifthPassengerCents / 100,
      }
    : {
        baseCharge: fallback.baseChargeCents / 100,
        kmA: fallback.kmCentsA / 100,
        kmB: fallback.kmCentsB / 100,
        kmC: fallback.kmCentsC / 100,
        kmD: fallback.kmCentsD / 100,
        waitPerHour: fallback.waitPerHourCents / 100,
        baggageFee: fallback.baggageFeeCents / 100,
        fifthPassenger: fallback.fifthPassengerCents / 100,
      };

  return NextResponse.json(payload, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const centsPayload = {
    baseChargeCents: toCents(data.baseCharge),
    kmCentsA: toCents(data.kmA),
    kmCentsB: toCents(data.kmB),
    kmCentsC: toCents(data.kmC),
    kmCentsD: toCents(data.kmD),
    waitPerHourCents: toCents(data.waitPerHour),
    baggageFeeCents: toCents(data.baggageFee),
    fifthPassengerCents: toCents(data.fifthPassenger),
  };

  const existing = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const id = existing?.id ?? 1;

  const updated = await prisma.tariffConfig.upsert({
    where: { id },
    update: centsPayload,
    create: { id, ...centsPayload },
  });

  (revalidateTag as unknown as (tag: string) => void)("tariff-config");
  return NextResponse.json(updated, { status: 200 });
}
