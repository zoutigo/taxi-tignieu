import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import { z } from "zod";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";

export const dynamic = "force-dynamic";

export default async function FeaturedTripEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const session = await auth();
  const isAdminLike = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  if (!isAdminLike) {
    redirect("/dashboard");
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return notFound();
  }

  const trip = await prisma.featuredTrip.findUnique({
    where: { id: parsedId.data },
    include: { pickupAddress: true, dropoffAddress: true },
  });
  if (!trip) return notFound();
  const serialisedTrip = {
    ...trip,
    distanceKm: trip.distanceKm ? Number(trip.distanceKm) : undefined,
    heroImageUrl: undefined,
    summary: trip.summary ?? undefined,
    badge: trip.badge ?? undefined,
    zoneLabel: trip.zoneLabel ?? undefined,
    featuredSlot: trip.featuredSlot ?? undefined,
    durationMinutes: trip.durationMinutes ?? undefined,
    basePriceCents: trip.basePriceCents ?? undefined,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Modifier un trajet mis en avant</h1>
        <p className="text-sm text-muted-foreground">
          Gérez le trajet type et les zones desservies qui alimentent la landing. Mobile-first, avec
          adresses via l’autocomplétion.
        </p>
      </div>
      <FeaturedTripsActions showCreate={false} />
      <FeaturedTripsAdmin
        initialTrips={[serialisedTrip]}
        showList={false}
        showForm
        initialEditId={trip.id}
      />
    </div>
  );
}
