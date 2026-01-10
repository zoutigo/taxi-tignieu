import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userAddressSchema } from "@/schemas/profile";
import { Prisma } from "@prisma/client";

const createAddressSchema = userAddressSchema.extend({
  setDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultAddressId: true },
    }),
    prisma.userAddress.findMany({
      where: { userId: session.user.id },
      include: { address: true },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json({
    addresses: addresses.map((item) => ({
      ...item,
      isDefault: item.id === user?.defaultAddressId,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues?.[0]?.message ?? "Impossible d'enregistrer cette adresse pour le moment.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  try {
    const { address, userAddress, defaultAddressId } = await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          name: parsed.data.name,
          street: parsed.data.street,
          streetNumber: parsed.data.streetNumber,
          postalCode: parsed.data.postalCode,
          city: parsed.data.city,
          country: parsed.data.country,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
        },
      });

      const userAddress = await tx.userAddress.create({
        data: {
          label: parsed.data.label,
          userId: session.user!.id,
          addressId: address.id,
        },
        include: { address: true },
      });

      const user = await tx.user.findUnique({
        where: { id: session.user!.id },
        select: { defaultAddressId: true },
      });

      const shouldSetDefault = Boolean(parsed.data.setDefault) || !user?.defaultAddressId;
      const nextDefaultId = shouldSetDefault ? userAddress.id : (user?.defaultAddressId ?? null);

      if (shouldSetDefault) {
        await tx.user.update({
          where: { id: session.user!.id },
          data: { defaultAddressId: userAddress.id },
        });
      }

      return { address, userAddress, defaultAddressId: nextDefaultId };
    });

    return NextResponse.json(
      {
        savedAddress: {
          ...userAddress,
          address,
          isDefault: userAddress.id === defaultAddressId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Vous avez déjà une adresse avec ce nom. Choisissez un autre libellé." },
        { status: 409 }
      );
    }
    console.error("Erreur création adresse profil", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer cette adresse pour le moment." },
      { status: 500 }
    );
  }
}
