import { FeaturedSlot, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const withPricesSelect = {
  id: true,
  label: true,
  distanceKm: true,
  durationMinutes: true,
  priceCents: true,
  order: true,
} satisfies Prisma.FeaturedPoiSelect;

const baseSelect = {
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
} satisfies Prisma.FeaturedTripSelect;

const zoneWithPricesSelect = {
  ...baseSelect,
  poiDestinations: {
    select: withPricesSelect,
    orderBy: { order: "asc" },
  },
} satisfies Prisma.FeaturedTripSelect;

export type PublicFeaturedTrip = Prisma.FeaturedTripGetPayload<{ select: typeof baseSelect }>;
export type PublicZoneFeaturedTrip = Prisma.FeaturedTripGetPayload<{
  select: typeof zoneWithPricesSelect;
}>;

export async function getPublicFeaturedTypeTrips(): Promise<PublicFeaturedTrip[]> {
  try {
    return await prisma.featuredTrip.findMany({
      where: { featuredSlot: FeaturedSlot.TYPE, active: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      select: baseSelect,
    });
  } catch {
    return [];
  }
}

export async function getPublicFeaturedZoneTrips(): Promise<PublicZoneFeaturedTrip[]> {
  try {
    return await prisma.featuredTrip.findMany({
      where: { featuredSlot: FeaturedSlot.ZONE, active: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      select: zoneWithPricesSelect,
    });
  } catch {
    return [];
  }
}
