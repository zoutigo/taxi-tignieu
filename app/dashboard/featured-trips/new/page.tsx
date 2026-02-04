import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";

export default async function FeaturedTripNewPage() {
  const session = await auth();
  const isAdminLike = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  if (!isAdminLike) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Créer un trajet mis en avant</h1>
        <p className="text-sm text-muted-foreground">
          Gérez le trajet type et les zones desservies qui alimentent la landing. Mobile-first, avec
          adresses via l’autocomplétion.
        </p>
      </div>
      <FeaturedTripsActions showCreate={false} />
      <FeaturedTripsAdmin initialTrips={[]} showList={false} showForm />
    </div>
  );
}
