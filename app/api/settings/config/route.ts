import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Address, SiteConfig } from "@prisma/client";

const payloadSchema = z.object({
  name: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  siret: z.string().min(3).optional(),
  ape: z.string().min(3).optional(),
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

type SiteConfigRecord = {
  id: number;
  name?: string | null;
  ownerName?: string | null;
  siret?: string | null;
  ape?: string | null;
  phone: string;
  email: string;
  address: Address;
};

export async function GET() {
  const config = (await prisma.siteConfig.findFirst({
    include: { address: true },
  })) as SiteConfigRecord | null;
  if (!config?.address) {
    return NextResponse.json(null, { status: 200 });
  }
  return NextResponse.json(
    {
      name: config.name,
      ownerName: config.ownerName,
      siret: config.siret,
      ape: config.ape,
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
  const raw = await req.json().catch(() => null);
  const cleaned =
    raw && typeof raw === "object"
      ? {
          ...raw,
          name: typeof raw.name === "string" && raw.name.trim() === "" ? undefined : raw.name,
          ownerName:
            typeof raw.ownerName === "string" && raw.ownerName.trim() === ""
              ? undefined
              : raw.ownerName,
          siret: typeof raw.siret === "string" && raw.siret.trim() === "" ? undefined : raw.siret,
          ape: typeof raw.ape === "string" && raw.ape.trim() === "" ? undefined : raw.ape,
          address: raw.address
            ? {
                ...raw.address,
                streetNumber:
                  typeof raw.address.streetNumber === "string" &&
                  raw.address.streetNumber.trim() === ""
                    ? undefined
                    : raw.address.streetNumber,
                latitude:
                  raw.address.latitude === ""
                    ? null
                    : typeof raw.address.latitude === "number"
                      ? raw.address.latitude
                      : null,
                longitude:
                  raw.address.longitude === ""
                    ? null
                    : typeof raw.address.longitude === "number"
                      ? raw.address.longitude
                      : null,
              }
            : undefined,
        }
      : null;

  const parsed = payloadSchema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const existing = (await prisma.siteConfig.findFirst({
    include: { address: true },
  })) as (SiteConfig & { address: Address }) | null;

  if (!existing) {
    const created = await prisma.siteConfig.create({
      data: {
        name: data.name ?? null,
        ownerName: data.ownerName ?? null,
        siret: data.siret ?? null,
        ape: data.ape ?? null,
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
      name: data.name ?? null,
      ownerName: data.ownerName ?? null,
      siret: data.siret ?? null,
      ape: data.ape ?? null,
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
