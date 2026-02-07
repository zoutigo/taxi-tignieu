import type { Prisma } from "@prisma/client";
import { FeaturedSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = searchParams.get("slot");
  const withPrices = searchParams.get("withPrices");

  const where: Prisma.FeaturedTripWhereInput =
    slot === "TYPE" || slot === "ZONE"
      ? { featuredSlot: slot as FeaturedSlot, active: true }
      : { active: true };

  const trips = await prisma.featuredTrip.findMany({
    where,
    orderBy: [{ featuredSlot: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      featuredSlot: true,
      pickupLabel: true,
      dropoffLabel: true,
      distanceKm: true,
      durationMinutes: true,
      basePriceCents: true,
      badge: true,
      zoneLabel: true,
      priority: true,
      active: true,
      poiDestinations: withPrices
        ? {
            select: {
              id: true,
              label: true,
              distanceKm: true,
              durationMinutes: true,
              priceCents: true,
              order: true,
            },
            orderBy: { order: "asc" },
          }
        : false,
    },
  });

  return NextResponse.json({ trips });
}
