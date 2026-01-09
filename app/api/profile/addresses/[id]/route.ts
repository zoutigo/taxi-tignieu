import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userAddressSchema } from "@/schemas/profile";

const updateSchema = userAddressSchema
  .partial()
  .extend({
    setDefault: z.boolean().optional(),
  })
  .refine(
    (value) => {
      const keys = Object.keys(value) as Array<keyof typeof value>;
      return (
        Boolean(value.setDefault) ||
        keys.some((key) => key !== "setDefault" && value[key] !== undefined)
      );
    },
    { message: "Aucune mise à jour fournie." }
  );

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const addressId = params.id;
  if (!addressId) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.userAddress.findUnique({
    where: { id: addressId },
    include: { address: true },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const addressData: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) addressData.name = parsed.data.name;
      if (parsed.data.street !== undefined) addressData.street = parsed.data.street;
      if (parsed.data.streetNumber !== undefined)
        addressData.streetNumber = parsed.data.streetNumber;
      if (parsed.data.postalCode !== undefined) addressData.postalCode = parsed.data.postalCode;
      if (parsed.data.city !== undefined) addressData.city = parsed.data.city;
      if (parsed.data.country !== undefined) addressData.country = parsed.data.country;
      if (parsed.data.latitude !== undefined) addressData.latitude = parsed.data.latitude;
      if (parsed.data.longitude !== undefined) addressData.longitude = parsed.data.longitude;

      const updates = await Promise.all([
        Object.keys(addressData).length
          ? tx.address.update({
              where: { id: existing.addressId },
              data: addressData,
            })
          : Promise.resolve(existing.address),
        parsed.data.label !== undefined
          ? tx.userAddress.update({
              where: { id: existing.id },
              data: { label: parsed.data.label },
              include: { address: true },
            })
          : tx.userAddress.findUnique({
              where: { id: existing.id },
              include: { address: true },
            }),
      ]);

      const updatedAddress = updates[0];
      const updatedUserAddress = updates[1]!;

      let defaultAddressId = (
        await tx.user.findUnique({
          where: { id: session.user!.id },
          select: { defaultAddressId: true },
        })
      )?.defaultAddressId;

      if (parsed.data.setDefault) {
        await tx.user.update({
          where: { id: session.user!.id },
          data: { defaultAddressId: existing.id },
        });
        defaultAddressId = existing.id;
      }

      return { updatedUserAddress, updatedAddress, defaultAddressId };
    });

    return NextResponse.json({
      address: {
        ...result.updatedUserAddress,
        address: result.updatedAddress,
        isDefault: result.updatedUserAddress.id === result.defaultAddressId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Vous avez déjà une adresse avec ce nom. Choisissez un autre libellé." },
        { status: 409 }
      );
    }
    console.error("Erreur mise à jour adresse profil", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour cette adresse pour le moment." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const addressId = params.id;
  if (!addressId) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  const target = await prisma.userAddress.findFirst({
    where: { id: addressId, userId: session.user.id },
    select: { id: true, addressId: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  const { defaultAddressId } = await prisma.$transaction(async (tx) => {
    await tx.userAddress.delete({ where: { id: target.id } });
    try {
      await tx.address.delete({ where: { id: target.addressId } });
    } catch {
      // Ignore if address is referenced elsewhere.
    }

    const currentUser = await tx.user.findUnique({
      where: { id: session.user!.id },
      select: { defaultAddressId: true },
    });

    let nextDefaultId = currentUser?.defaultAddressId ?? null;

    if (currentUser?.defaultAddressId === target.id) {
      const fallback = await tx.userAddress.findFirst({
        where: { userId: session.user!.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      nextDefaultId = fallback?.id ?? null;

      await tx.user.update({
        where: { id: session.user!.id },
        data: { defaultAddressId: nextDefaultId },
      });
    }

    return { defaultAddressId: nextDefaultId };
  });

  return NextResponse.json({ ok: true, defaultAddressId });
}
