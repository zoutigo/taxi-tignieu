import { NextResponse } from "next/server";
import {
  getPublicFeaturedTypeTrips,
  getPublicFeaturedZoneTrips,
} from "@/lib/featured-trips-public";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = searchParams.get("slot");
  const withPrices = searchParams.get("withPrices");

  let trips;
  if (slot === "TYPE") {
    trips = await getPublicFeaturedTypeTrips();
  } else if (slot === "ZONE" && withPrices === "1") {
    trips = await getPublicFeaturedZoneTrips();
  } else if (slot === "ZONE") {
    trips = (await getPublicFeaturedZoneTrips()).map((trip) => ({
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      summary: trip.summary,
      featuredSlot: trip.featuredSlot,
      pickupLabel: trip.pickupLabel,
      dropoffLabel: trip.dropoffLabel,
      distanceKm: trip.distanceKm,
      durationMinutes: trip.durationMinutes,
      basePriceCents: trip.basePriceCents,
      badge: trip.badge,
      zoneLabel: trip.zoneLabel,
      priority: trip.priority,
      active: trip.active,
    }));
  } else {
    const [typeTrips, zoneTrips] = await Promise.all([
      getPublicFeaturedTypeTrips(),
      getPublicFeaturedZoneTrips(),
    ]);
    trips = [...typeTrips, ...zoneTrips];
  }

  return NextResponse.json({ trips });
}
