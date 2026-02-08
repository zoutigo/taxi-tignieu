import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().trim().min(3),
  street: z.string().trim().optional(),
  streetNumber: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  lat: z.number(),
  lng: z.number(),
});

const adminOnly = async () => {
  const session = await auth();
  const isAdminLike = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  if (!isAdminLike) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  return null;
};

export async function POST(req: Request) {
  const forbidden = await adminOnly();
  if (forbidden) return forbidden;

  const raw = await req.json().catch(() => ({}));
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await prisma.address.findFirst({
    where: {
      name: data.label,
      street: data.street ?? null,
      streetNumber: data.streetNumber ?? null,
      postalCode: data.postcode ?? null,
      city: data.city ?? null,
      country: data.country ?? "France",
      latitude: data.lat,
      longitude: data.lng,
    },
  });

  if (existing) {
    return NextResponse.json({ address: existing }, { status: 200 });
  }

  const created = await prisma.address.create({
    data: {
      name: data.label,
      street: data.street ?? null,
      streetNumber: data.streetNumber ?? null,
      postalCode: data.postcode ?? null,
      city: data.city ?? null,
      country: data.country ?? "France",
      latitude: data.lat,
      longitude: data.lng,
    },
  });

  return NextResponse.json({ address: created }, { status: 201 });
}
