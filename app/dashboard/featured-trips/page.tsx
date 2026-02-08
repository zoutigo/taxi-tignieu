"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import FeaturedTripsActions from "@/components/dashboard/featured-trips-actions.client";
import { FeaturedTripsAdmin } from "@/components/dashboard/featured-trips-admin";

type Trip = any;

export default function FeaturedTripsPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTrips = async () => {
      try {
        const res = await fetch("/api/admin/featured-trips", { cache: "no-store" });
        const json = await res.json();
        if (mounted) setTrips(json.trips ?? []);
      } catch (e) {
        console.error("featured trips fetch error", e);
        if (mounted) setTrips([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchTrips();
    return () => {
      mounted = false;
    };
  }, []);

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
        {loading ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
            Chargement des trajets...
          </div>
        ) : (
          <FeaturedTripsAdmin initialTrips={trips ?? []} showForm={false} />
        )}
      </div>
    </div>
  );
}
