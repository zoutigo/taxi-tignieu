import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function FeaturedTripEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return notFound();

  const session = await auth();
  const isAdminLike = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  if (!isAdminLike) redirect("/dashboard");

  const trip = await prisma.featuredTrip.findUnique({
    where: { id: parsedId.data },
    include: { pickupAddress: true, dropoffAddress: true, poiDestinations: true },
  });
  if (!trip) return notFound();

  const serialisedTrip = {
    ...trip,
    slug: trip.slug,
    title: trip.title ?? "",
    pickupLabel: trip.pickupLabel ?? "",
    pickupAddressId: trip.pickupAddressId ?? trip.pickupAddress?.id ?? "",
    dropoffAddressId: trip.dropoffAddressId ?? trip.dropoffAddress?.id ?? undefined,
    dropoffLabel: undefined,
    summary: trip.summary ?? undefined,
    badge: trip.badge ?? undefined,
    zoneLabel: trip.zoneLabel ?? undefined,
    distanceKm: trip.distanceKm ? Number(trip.distanceKm) : undefined,
    durationMinutes: trip.durationMinutes ?? undefined,
    basePriceCents: trip.basePriceCents ?? undefined,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    pickupAddress: trip.pickupAddress
      ? {
          id: trip.pickupAddress.id,
          label: (trip.pickupAddress as unknown as { label?: string })?.label ?? null,
          street: trip.pickupAddress.street,
          city: trip.pickupAddress.city,
        }
      : null,
    dropoffAddress: trip.dropoffAddress
      ? {
          id: trip.dropoffAddress.id,
          label: (trip.dropoffAddress as unknown as { label?: string })?.label ?? null,
          street: trip.dropoffAddress.street,
          city: trip.dropoffAddress.city,
        }
      : null,
    poiDestinations: trip.poiDestinations.map((p) => ({
      id: p.id,
      label: p.label ?? "",
      dropoffAddressId: p.dropoffAddressId ?? "",
      distanceKm: p.distanceKm != null ? Number(p.distanceKm) : undefined,
      durationMinutes: p.durationMinutes ?? undefined,
      priceCents: p.priceCents ?? undefined,
      order: p.order ?? 0,
      tripId: p.tripId,
    })),
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
