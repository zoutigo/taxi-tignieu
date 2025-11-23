import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  phone: z.string().min(3),
  email: z.string().email(),
  address: z.object({
    street: z.string().min(2),
    streetNumber: z.string().nullable().optional(),
    postalCode: z.string().min(2),
    city: z.string().min(2),
    country: z.string().min(2),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }),
});

export async function GET() {
  const config = await prisma.siteConfig.findFirst({
    include: { address: true },
  });
  if (!config?.address) {
    return NextResponse.json(null, { status: 200 });
  }
  return NextResponse.json(
    {
      phone: config.phone,
      email: config.email,
      address: {
        street: config.address.street,
        streetNumber: config.address.streetNumber,
        postalCode: config.address.postalCode,
        city: config.address.city,
        country: config.address.country,
        latitude: config.address.latitude,
        longitude: config.address.longitude,
      },
    },
    { status: 200 }
  );
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.siteConfig.findFirst({
    include: { address: true },
  });

  if (!existing) {
    const created = await prisma.siteConfig.create({
      data: {
        phone: data.phone,
        email: data.email,
        address: {
          create: {
            street: data.address.street,
            streetNumber: data.address.streetNumber ?? null,
            postalCode: data.address.postalCode,
            city: data.address.city,
            country: data.address.country,
            latitude: data.address.latitude ?? null,
            longitude: data.address.longitude ?? null,
          },
        },
      },
      include: { address: true },
    });
    return NextResponse.json(created, { status: 200 });
  }

  const updated = await prisma.siteConfig.update({
    where: { id: existing.id },
    data: {
      phone: data.phone,
      email: data.email,
      address: {
        update: {
          street: data.address.street,
          streetNumber: data.address.streetNumber ?? null,
          postalCode: data.address.postalCode,
          city: data.address.city,
          country: data.address.country,
          latitude: data.address.latitude ?? null,
          longitude: data.address.longitude ?? null,
        },
      },
    },
    include: { address: true },
  });

  (revalidateTag as unknown as (tag: string) => void)("site-config");
  return NextResponse.json(updated, { status: 200 });
}
