"use client";

import { useEffect, useState } from "react";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";
import type { FeaturedTripInput } from "@/lib/validation/featured-trip";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";

type Props = { id: string };

export default function FeaturedTripsEditPageClient({ id }: Props) {
  const [trip, setTrip] = useState<FeaturedTripInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/featured-trips", { cache: "no-store" });
        const json = await res.json();
        const found = (json.trips ?? []).find((t: FeaturedTripInput) => t.id === id);
        if (mounted) setTrip(found ?? null);
      } catch (e) {
        console.error("featured trip fetch error", e);
        if (mounted) setTrip(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

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
      {loading ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
          Chargement du trajet...
        </div>
      ) : trip ? (
        <FeaturedTripsAdmin
          initialTrips={[trip]}
          showList={false}
          showForm
          initialEditId={trip.id}
        />
      ) : (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Trajet introuvable.
        </div>
      )}
    </div>
  );
}
