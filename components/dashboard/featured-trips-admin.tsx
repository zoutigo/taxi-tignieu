"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { featuredTripSchema, type FeaturedTripInput } from "@/lib/validation/featured-trip";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { loadPaginationSettings, paginateArray } from "@/lib/pagination";
import { useRouter } from "next/navigation";
import { AddressActionButton } from "@/components/ui/address-action-button";
import { Pencil, Trash2 } from "lucide-react";

type TripWithAddrs = FeaturedTripInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  pickupAddress?: { label?: string | null; street?: string | null; city?: string | null } | null;
  dropoffAddress?: { label?: string | null; street?: string | null; city?: string | null } | null;
};

type Props = {
  initialTrips: TripWithAddrs[];
  initialEditId?: string | null;
  showList?: boolean;
  showForm?: boolean;
};

export function FeaturedTripsAdmin({
  initialTrips,
  initialEditId = null,
  showList = true,
  showForm = true,
}: Props) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [editingId, setEditingId] = useState<string | null>(initialEditId);
  const [saving, setSaving] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setCalculating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = loadPaginationSettings().bookings ?? 10;

  const defaultValues: FeaturedTripInput = {
    id: undefined,
    slug: "",
    title: "",
    summary: "",
    featuredSlot: "ZONE",
    pickupLabel: "",
    dropoffLabel: "",
    distanceKm: undefined,
    durationMinutes: undefined,
    basePriceCents: undefined,
    priority: 100,
    active: true,
    badge: "",
    zoneLabel: "",
    heroImageUrl: undefined,
  };

  const form = useForm<FeaturedTripInput>({
    resolver: zodResolver(featuredTripSchema) as Resolver<FeaturedTripInput>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const {
    formState: { errors },
  } = form;

  // keep slug in sync with title
  const titleValue = form.watch("title");
  useEffect(() => {
    const nextSlug = slugify(titleValue ?? "");
    form.setValue("slug", nextSlug, { shouldDirty: true, shouldValidate: true });
    void form.trigger();
  }, [titleValue, form]);

  const renderError = (path: keyof FeaturedTripInput) =>
    errors[path]?.message ? (
      <p className="text-xs text-destructive mt-1">{String(errors[path]?.message)}</p>
    ) : null;

  useEffect(() => {
    if (initialEditId) {
      setEditingId(initialEditId);
      const found = initialTrips.find((t) => t.id === initialEditId);
      if (found) resetTo(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditId]);

  const resetTo = (trip?: TripWithAddrs) => {
    form.reset(
      trip
        ? {
            ...trip,
            id: trip.id,
            distanceKm: trip.distanceKm ? Number(trip.distanceKm) : undefined,
            featuredSlot: (trip.featuredSlot as "TYPE" | "ZONE" | null) ?? undefined,
          }
        : defaultValues
    );
    setPickupCoords(null);
    setDropoffCoords(null);
    void form.trigger();
  };

  const onSubmit = async (values: FeaturedTripInput) => {
    setSaving(true);
    try {
      const payload: FeaturedTripInput =
        editingId && !values.id ? { ...values, id: editingId } : { ...values };
      // normalise fields for zod/api (no nulls)
      if (payload.featuredSlot === null) payload.featuredSlot = undefined;
      if (payload.featuredSlot !== "TYPE" && payload.featuredSlot !== "ZONE")
        payload.featuredSlot = undefined;
      payload.heroImageUrl = undefined;
      const method = payload.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/featured-trips", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.field === "slug" && json?.error) {
          form.setError("slug", { type: "server", message: json.error });
        }
        throw new Error(json.error ? JSON.stringify(json.error) : "Erreur serveur");
      }
      const saved = json.trip as TripWithAddrs;
      setTrips((prev) => {
        const without = prev.filter((t) => t.id !== saved.id);
        return [...without, saved].sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.createdAt > b.createdAt ? -1 : 1;
        });
      });
      if (initialEditId) {
        router.push("/dashboard/featured-trips");
      } else {
        setEditingId(null);
        resetTo();
      }
    } catch (e) {
      console.error("featured trips save error", e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const compute = async () => {
      if (!pickupCoords || !dropoffCoords) return;

      const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
        const R = 6371;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const la1 = (a.lat * Math.PI) / 180;
        const la2 = (b.lat * Math.PI) / 180;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      };

      setCalculating(true);
      try {
        let distanceKm: number | undefined;
        let durationMinutes: number | undefined;

        try {
          const distRes = await fetch("/api/forecast/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pickup: pickupCoords, dropoff: dropoffCoords }),
          });
          const distJson = await distRes.json();
          if (distRes.ok && distJson.distanceKm != null) {
            distanceKm = Number(distJson.distanceKm);
            durationMinutes = distJson.durationMinutes ?? undefined;
          }
        } catch {
          // ignore ORS error, we'll fallback
        }

        if (distanceKm === undefined) {
          distanceKm = Number(haversine(pickupCoords, dropoffCoords).toFixed(2));
        }
        form.setValue("distanceKm", distanceKm, { shouldDirty: true, shouldValidate: true });
        if (durationMinutes !== undefined)
          form.setValue("durationMinutes", durationMinutes, {
            shouldDirty: true,
            shouldValidate: true,
          });

        const quoteRes = await fetch("/api/forecast/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickup: pickupCoords,
            dropoff: dropoffCoords,
            date: new Date().toISOString().slice(0, 10),
            time: "12:00",
            passengers: 1,
            baggageCount: 1,
            distanceKm,
            durationMinutes,
          }),
        });
        const quoteJson = await quoteRes.json();
        if (quoteRes.ok && quoteJson.price != null) {
          form.setValue("basePriceCents", Math.round(Number(quoteJson.price) * 100), {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } catch (e) {
        console.error("featured trips compute error", e);
      } finally {
        setCalculating(false);
      }
    };
    void compute();
  }, [pickupCoords, dropoffCoords, form]);

  const onDelete = async (id: string) => {
    setSaving(true);
    try {
      await fetch("/api/admin/featured-trips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setTrips((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) {
        setEditingId(null);
        resetTo();
      }
    } catch (e) {
      console.error("featured trips delete error", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
      {showList ? (
        <div className="space-y-3">
          {paginateArray(
            trips.sort((a, b) => {
              if (a.active !== b.active) return a.active ? -1 : 1;
              if (a.priority !== b.priority) return a.priority - b.priority;
              return a.createdAt > b.createdAt ? -1 : 1;
            }),
            page,
            pageSize
          ).items.map((trip) => (
            <div
              key={trip.id}
              className={cn(
                "rounded-xl border p-4 shadow-sm transition hover:shadow-md",
                trip.active ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{trip.slug}</Badge>
                    {trip.featuredSlot ? (
                      <Badge variant={trip.featuredSlot === "TYPE" ? "default" : "outline"}>
                        {trip.featuredSlot === "TYPE" ? "Trajet type" : "Zone desservie"}
                      </Badge>
                    ) : null}
                    {!trip.active && <Badge variant="destructive">Inactif</Badge>}
                  </div>
                  <h3 className="text-lg font-semibold">{trip.title}</h3>
                  {trip.summary ? (
                    <p className="text-sm text-muted-foreground">{trip.summary}</p>
                  ) : null}
                  <p className="text-sm">
                    <span className="font-medium">Départ :</span> {trip.pickupLabel}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Arrivée :</span> {trip.dropoffLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trip.distanceKm ? `${trip.distanceKm.toString()} km` : "Distance n/c"} ·{" "}
                    {trip.durationMinutes ? `${trip.durationMinutes} min` : "Durée n/c"} ·{" "}
                    {trip.basePriceCents != null
                      ? `${(trip.basePriceCents / 100).toFixed(2)} €`
                      : "Prix n/c"}
                    {trip.priority != null ? ` · Priorité ${trip.priority}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <AddressActionButton
                    icon={Pencil}
                    label="Éditer"
                    variant="edit"
                    onClick={() => router.push(`/dashboard/featured-trips/${trip.id}/edit`)}
                  />
                  <AddressActionButton
                    icon={Trash2}
                    label="Supprimer"
                    variant="edit"
                    onClick={() => onDelete(trip.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_10px_25px_rgba(239,68,68,0.35)]"
                  />
                </div>
              </div>
            </div>
          ))}
          {trips.length > pageSize ? (
            <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <span>
                Page {page} / {paginateArray(trips, page, pageSize).totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= paginateArray(trips, page, pageSize).totalPages}
                onClick={() =>
                  setPage((p) => Math.min(p + 1, paginateArray(trips, page, pageSize).totalPages))
                }
              >
                Suivant
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {showForm ? (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
          <form
            className="mt-4 space-y-4"
            onSubmit={form.handleSubmit(onSubmit as SubmitHandler<FeaturedTripInput>)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="title">Titre *</Label>
                {editingId || form.watch("id") ? (
                  <input type="hidden" {...form.register("id")} />
                ) : null}
                <Input id="title" {...form.register("title")} placeholder="Tignieu → Aéroport" />
                {renderError("title")}
              </div>
              <div className="space-y-1">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  {...form.register("slug")}
                  readOnly
                  aria-readonly
                  className="bg-muted/50 cursor-not-allowed"
                  placeholder="tignieu-aeroport"
                />
                {renderError("slug")}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="summary">Résumé</Label>
              <Textarea
                id="summary"
                rows={2}
                {...form.register("summary")}
                placeholder="Transfert rapide, 24/7"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Slot</Label>
                <Select
                  value={form.watch("featuredSlot") ?? "NONE"}
                  onValueChange={(v) =>
                    form.setValue("featuredSlot", v === "NONE" ? undefined : (v as "TYPE" | "ZONE"))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zone desservie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Zone desservie</SelectItem>
                    <SelectItem value="TYPE">Trajet type</SelectItem>
                    <SelectItem value="ZONE">Zone desservie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="priority">Priorité</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={10000}
                  {...form.register("priority", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Départ *</Label>
                <AddressAutocomplete
                  value={form.watch("pickupLabel") ?? ""}
                  onChange={(val) =>
                    form.setValue("pickupLabel", val, { shouldDirty: true, shouldValidate: true })
                  }
                  onSelect={(addr) => {
                    form.setValue("pickupLabel", addr.label ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    if (addr.lat != null && addr.lng != null)
                      setPickupCoords({ lat: addr.lat, lng: addr.lng });
                  }}
                  suppressInitial
                  placeholder="Adresse de départ"
                  locked={Boolean(editingId)}
                />
                {renderError("pickupLabel")}
              </div>
              <div className="space-y-1">
                <Label>Arrivée *</Label>
                <AddressAutocomplete
                  value={form.watch("dropoffLabel") ?? ""}
                  onChange={(val) =>
                    form.setValue("dropoffLabel", val, { shouldDirty: true, shouldValidate: true })
                  }
                  onSelect={(addr) => {
                    form.setValue("dropoffLabel", addr.label ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    if (addr.lat != null && addr.lng != null)
                      setDropoffCoords({ lat: addr.lat, lng: addr.lng });
                  }}
                  suppressInitial
                  placeholder="Adresse d'arrivée"
                  locked={Boolean(editingId)}
                />
                {renderError("dropoffLabel")}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="distanceKm">Distance (km)</Label>
                <Input
                  id="distanceKm"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("distanceKm", { valueAsNumber: true })}
                  disabled
                  value={Number.isFinite(form.watch("distanceKm")) ? form.watch("distanceKm") : ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="durationMinutes">Durée (min)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={0}
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                  disabled
                  value={
                    Number.isFinite(form.watch("durationMinutes"))
                      ? form.watch("durationMinutes")
                      : ""
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="basePriceCents">Prix base (cents)</Label>
                <Input
                  id="basePriceCents"
                  type="number"
                  min={0}
                  {...form.register("basePriceCents", { valueAsNumber: true })}
                  disabled
                  value={
                    Number.isFinite(form.watch("basePriceCents"))
                      ? form.watch("basePriceCents")
                      : ""
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="badge">Badge</Label>
                <Input
                  id="badge"
                  {...form.register("badge")}
                  placeholder="Trajet type, Zone phare..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zoneLabel">Zone</Label>
                <Input
                  id="zoneLabel"
                  {...form.register("zoneLabel")}
                  placeholder="Lyon Saint-Exupéry"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Actif</p>
                <p className="text-xs text-muted-foreground">Visible sur la landing</p>
              </div>
              <Switch
                checked={form.watch("active") ?? true}
                onCheckedChange={(v) => form.setValue("active", v)}
                className="cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving || form.formState.isSubmitting}
                className="flex-1"
                onClick={async (e) => {
                  e.preventDefault();
                  await onSubmit(form.getValues());
                }}
              >
                {editingId ? "Mettre à jour" : "Créer"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setEditingId(null);
                    resetTo();
                  }}
                >
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
