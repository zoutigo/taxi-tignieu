import { prisma } from "@/lib/prisma";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";

export default async function FeaturedTripsPage() {
  const trips = await prisma.featuredTrip.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: { pickupAddress: true, dropoffAddress: true },
  });
  const initialTrips = JSON.parse(JSON.stringify(trips));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Trajets mis en avant</h1>
        <p className="text-sm text-muted-foreground">
          Gérez le trajet type et les zones desservies qui alimentent la landing. Mobile-first, avec
          adresses via l’autocomplétion.
        </p>
      </div>
      <div className="mt-4">
        <FeaturedTripsActions backHref="/dashboard" backLabel="Retour au dashboard" />
      </div>
      <div className="mt-6">
        <FeaturedTripsAdmin initialTrips={initialTrips} showForm={false} />
      </div>
    </div>
  );
}
