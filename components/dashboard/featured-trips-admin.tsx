"use client";
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { featuredTripSchema, type FeaturedTripInput } from "@/lib/validation/featured-trip";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { AppMessage } from "@/components/app-message";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  MapPin,
  Pencil,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AddressData } from "@/lib/booking-utils";
import { fetchAddressData } from "@/lib/booking-utils";
import { loadPaginationSettings, paginateArray } from "@/lib/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { slugify } from "@/lib/slugify";

type Props = {
  initialTrips: Array<FeaturedTripInput & Record<string, any>>;
  initialEditId?: string | null;
  showList?: boolean;
  showForm?: boolean;
};

type AddressSelection = (AddressData & { id?: string }) | null;

type PoiDraft = {
  label: string;
  address: AddressSelection;
};

const defaultTripValues: FeaturedTripInput = {
  slug: "",
  title: "",
  summary: "",
  featuredSlot: null,
  pickupLabel: "",
  dropoffLabel: undefined,
  pickupAddressId: "" as unknown as string,
  dropoffAddressId: undefined,
  distanceKm: undefined,
  durationMinutes: undefined,
  basePriceCents: undefined,
  priority: 100,
  active: true,
  badge: "",
  zoneLabel: "",
  poiDestinations: [],
};

export function FeaturedTripsAdmin({
  initialTrips,
  initialEditId = null,
  showList = true,
  showForm = true,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [messageDismissed, setMessageDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addPoiOpen, setAddPoiOpen] = useState(false);
  const [poiDraft, setPoiDraft] = useState<PoiDraft>({ label: "", address: null });
  const [pickupAddress, setPickupAddress] = useState<AddressSelection>(null);
  const [dropoffAddress, setDropoffAddress] = useState<AddressSelection>(null);
  const [poiAddresses, setPoiAddresses] = useState<Record<string, AddressSelection>>({});
  const [poiInputMode, setPoiInputMode] = useState<Record<string, boolean>>({});
  const [pickupEditing, setPickupEditing] = useState(false);
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [trips, setTrips] = useState(initialTrips);
  const [page, setPage] = useState(1);
  const pageSize = loadPaginationSettings().bookings;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState(false);

  const tripToEdit = useMemo(() => {
    if (!trips?.length) return null;
    if (initialEditId) return trips.find((t) => t.id === initialEditId) ?? null;
    return trips[0] ?? null;
  }, [initialEditId, trips]);

  const paged = useMemo(() => paginateArray(trips, page, pageSize), [trips, page, pageSize]);

  const form = useForm<FeaturedTripInput>({
    resolver: zodResolver(featuredTripSchema) as any,
    mode: "onChange",
    defaultValues: defaultTripValues as FeaturedTripInput,
  }) as any;
  const titleValue = form.watch("title");

  const firstErrorMessage = useMemo(() => {
    const walk = (err: unknown, trail: string[]): string | null => {
      if (!err || typeof err !== "object") return null;
      if ("message" in err && typeof (err as any).message === "string" && (err as any).message) {
        const label = trail.filter(Boolean).join(" › ");
        return label ? `${label}: ${(err as any).message}` : (err as any).message;
      }
      for (const [key, value] of Object.entries(err as Record<string, unknown>)) {
        const found = walk(value, [...trail, key.replace(/\.\d+$/, "")]);
        if (found) return found;
      }
      return null;
    };
    return walk(form.formState.errors, []);
  }, [form.formState.errors]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "poiDestinations",
  });

  const ensureCoords = useCallback(async (addr: AddressSelection): Promise<AddressSelection> => {
    if (!addr) return null;
    if (Number.isFinite(addr.lat) && Number.isFinite(addr.lng)) return addr;
    const fetched = await fetchAddressData(addr.label);
    return { ...addr, ...fetched };
  }, []);

  const serializeTripDefaults = useCallback(
    async (trip: typeof tripToEdit | null) => {
      if (!trip) return defaultTripValues;
      const {
        heroImageUrl: _heroImageUrl,
        dropoffAddress: dropoffAddressObj,
        ...rest
      } = trip as any;

      const pickupFromDb =
        trip.pickupAddress ??
        (trip.pickupLabel ? { label: trip.pickupLabel, street: "", city: "", postcode: "" } : null);
      const pickupAddr = pickupFromDb
        ? await ensureCoords({
            label:
              pickupFromDb.label ||
              [
                pickupFromDb.street,
                pickupFromDb.postcode ?? (pickupFromDb as any).postalCode,
                pickupFromDb.city,
              ]
                .filter(Boolean)
                .join(" "),
            street: pickupFromDb.street ?? undefined,
            city: pickupFromDb.city ?? undefined,
            postcode: pickupFromDb.postcode ?? (pickupFromDb as any).postalCode ?? undefined,
            country: pickupFromDb.country ?? undefined,
            lat: (pickupFromDb as any).latitude ?? NaN,
            lng: (pickupFromDb as any).longitude ?? NaN,
            id: pickupFromDb.id ?? trip.pickupAddressId,
          })
        : null;

      const poiDefaults =
        (trip.poiDestinations ?? []).map((p: any, idx: number) => ({
          id: p.id,
          label: p.label ?? "",
          dropoffAddressId: p.dropoffAddressId ?? p.dropoffAddress?.id,
          distanceKm: p.distanceKm != null ? Number(p.distanceKm) : undefined,
          durationMinutes: p.durationMinutes ?? undefined,
          priceCents: p.priceCents ?? undefined,
          order: p.order ?? idx,
        })) || [];

      const poiAddrMap: Record<string, AddressSelection> = {};
      await Promise.all(
        (trip.poiDestinations ?? []).map(async (p: any) => {
          const addr =
            p.dropoffAddress ??
            (p.label
              ? { label: p.label, street: p.street, city: p.city, postcode: p.postcode }
              : null);
          if (!addr) return;
          const enriched = await ensureCoords({
            label:
              addr.label ||
              [addr.street, addr.postcode ?? (addr as any).postalCode, addr.city]
                .filter(Boolean)
                .join(" "),
            street: addr.street ?? undefined,
            city: addr.city ?? undefined,
            postcode: addr.postcode ?? (addr as any).postalCode ?? undefined,
            country: addr.country ?? undefined,
            lat: (addr as any).latitude ?? NaN,
            lng: (addr as any).longitude ?? NaN,
            id: addr.id ?? p.dropoffAddressId,
          });
          const key = p.dropoffAddressId ?? p.id ?? `poi-${p.label}`;
          poiAddrMap[key] = enriched;
        })
      );

      setPickupAddress(pickupAddr);
      setDropoffAddress(null);
      setPoiAddresses(poiAddrMap);
      setPoiInputMode(
        Object.keys(poiAddrMap).reduce<Record<string, boolean>>((acc, k) => {
          acc[k] = false;
          return acc;
        }, {})
      );

      return {
        ...defaultTripValues,
        ...rest,
        pickupAddressId: pickupAddr?.id ?? trip.pickupAddressId ?? "",
        dropoffAddressId: undefined,
        dropoffLabel: undefined,
        poiDestinations: poiDefaults,
      };
    },
    // tripToEdit is stable from state; lint false-positive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ensureCoords, tripToEdit]
  );

  useEffect(() => {
    const applyDefaults = async () => {
      const defaults = await serializeTripDefaults(tripToEdit);
      form.reset(defaults);
      setManualSlug(Boolean(defaults.slug));
      setServerError(null);
    };
    void applyDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripToEdit]);

  const persistAddress = useCallback(async (addr: AddressSelection) => {
    if (!addr) return null;
    const payload = {
      label: addr.label,
      street: addr.street ?? "",
      streetNumber: addr.streetNumber ?? "",
      postcode: addr.postcode ?? "",
      city: addr.city ?? "",
      country: addr.country ?? "France",
      lat: addr.lat,
      lng: addr.lng,
    };
    try {
      const res = await fetch("/api/admin/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.address?.id) {
        return { ...addr, id: json.address.id };
      }
      throw new Error(json.error ?? "Adresse non enregistrée");
    } catch (e) {
      console.error("address save error", e);
      return null;
    }
  }, []);

  const computeMetrics = useCallback(async (pickup: AddressSelection, drop: AddressSelection) => {
    if (!pickup || !drop)
      return { distanceKm: undefined, durationMinutes: undefined, price: undefined };
    const ready =
      Number.isFinite(pickup.lat) &&
      Number.isFinite(pickup.lng) &&
      Number.isFinite(drop.lat) &&
      Number.isFinite(drop.lng);
    if (!ready) return { distanceKm: undefined, durationMinutes: undefined, price: undefined };

    let distanceKm: number | undefined;
    let durationMinutes: number | undefined;
    let price: number | undefined;

    try {
      const resDist = await fetch("/api/forecast/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: { lat: pickup.lat, lng: pickup.lng },
          dropoff: { lat: drop.lat, lng: drop.lng },
        }),
      });
      const json = await resDist.json().catch(() => ({}));
      if (resDist.ok) {
        if (Number.isFinite(json.distanceKm)) distanceKm = Number(json.distanceKm);
        if (Number.isFinite(json.durationMinutes)) durationMinutes = Number(json.durationMinutes);
      }
    } catch {
      // ignore
    }

    try {
      const resQuote = await fetch("/api/forecast/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: { lat: pickup.lat, lng: pickup.lng },
          dropoff: { lat: drop.lat, lng: drop.lng },
          distanceKm: distanceKm,
          durationMinutes: durationMinutes,
          tariff: "A",
        }),
      });
      const json = await resQuote.json().catch(() => ({}));
      if (resQuote.ok && Number.isFinite(json.price)) {
        price = Number(json.price);
      }
      if (!distanceKm && Number.isFinite(json.distanceKm)) distanceKm = Number(json.distanceKm);
      if (!durationMinutes && Number.isFinite(json.durationMinutes))
        durationMinutes = Number(json.durationMinutes);
    } catch {
      // ignore
    }

    return { distanceKm, durationMinutes, price };
  }, []);

  const refreshPoiMetrics = useCallback(
    async (idx: number) => {
      const pickup = pickupAddress;
      const poiField = form.getValues(`poiDestinations.${idx}`);
      const poiKey = poiField.dropoffAddressId ?? poiField.id ?? `poi-${idx}`;
      const drop = poiAddresses[poiKey];
      const computed = await computeMetrics(pickup, drop);
      if (computed.distanceKm != null) {
        form.setValue(`poiDestinations.${idx}.distanceKm`, computed.distanceKm, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      if (computed.durationMinutes != null) {
        form.setValue(`poiDestinations.${idx}.durationMinutes`, computed.durationMinutes, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      if (computed.price != null) {
        form.setValue(`poiDestinations.${idx}.priceCents`, Math.round(computed.price * 100), {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    },
    [computeMetrics, form, pickupAddress, poiAddresses]
  );

  const refreshAllPoiMetrics = useCallback(() => {
    fields.forEach((_, idx) => {
      void refreshPoiMetrics(idx);
    });
  }, [fields, refreshPoiMetrics]);

  useEffect(() => {
    refreshAllPoiMetrics();
  }, [pickupAddress?.id, pickupAddress?.lat, pickupAddress?.lng, refreshAllPoiMetrics]);

  const handlePickupSelect = async (addr: AddressData) => {
    const enriched = await ensureCoords(addr);
    const saved = await persistAddress(enriched);
    if (!saved?.id) return;
    setPickupAddress(saved);
    setPickupEditing(false);
    form.setValue("pickupLabel", saved.label, { shouldDirty: true });
    form.setValue("pickupAddressId", saved.id, { shouldDirty: true, shouldValidate: true });
    refreshAllPoiMetrics();
  };

  const handleDropoffSelect = async (addr: AddressData) => {
    const enriched = await ensureCoords(addr);
    const saved = await persistAddress(enriched);
    if (!saved?.id) return;
    setDropoffAddress(saved);
    form.setValue("dropoffLabel", undefined);
    form.setValue("dropoffAddressId", undefined);
  };

  const handlePoiSelect = async (idx: number, addr: AddressData) => {
    const enriched = await ensureCoords(addr);
    const saved = await persistAddress(enriched);
    if (!saved?.id) return;
    const key = saved.id ?? fields[idx]?.id ?? `poi-${idx}`;
    setPoiAddresses((prev) => ({ ...prev, [key]: saved }));
    setPoiInputMode((prev) => ({ ...prev, [key]: false }));
    form.setValue(`poiDestinations.${idx}.dropoffAddressId`, saved.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    await refreshPoiMetrics(idx);
  };

  const addPoiFromDraft = async () => {
    if (!poiDraft.label?.trim() || !poiDraft.address) return;
    const enriched = await ensureCoords(poiDraft.address);
    const saved = await persistAddress(enriched);
    if (!saved?.id) return;
    const order = fields.length;
    const newId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `poi-${Date.now()}`;
    append({
      id: newId,
      label: poiDraft.label,
      dropoffAddressId: saved.id,
      distanceKm: undefined,
      durationMinutes: undefined,
      priceCents: undefined,
      order,
    });
    setPoiAddresses((prev) => ({ ...prev, [saved.id]: saved }));
    setPoiInputMode((prev) => ({ ...prev, [newId]: false }));
    setPoiDraft({ label: "", address: null });
    setAddPoiOpen(false);
  };

  const logErrors = useCallback(
    (label: string) => {
      const errors = form.formState.errors;
      if (!errors || Object.keys(errors).length === 0) return;
      // silent in production; kept for debugging when needed
    },
    [form.formState.errors]
  );

  const submitCore = async (values: FeaturedTripInput) => {
    setSaving(true);
    setServerError(null);
    try {
      if (fields.length === 0) {
        setServerError("Ajoutez au moins une destination POI.");
        return;
      }

      const toUndef = <T,>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

      const cleanedPoi = (values.poiDestinations ?? []).map((p, idx) => ({
        ...p,
        dropoffAddressId: toUndef(p.dropoffAddressId),
        distanceKm: toUndef(p.distanceKm),
        durationMinutes: toUndef(p.durationMinutes),
        priceCents: toUndef(p.priceCents),
        order: p.order ?? idx,
      }));

      const endpoint = values.id ? "/api/admin/featured-trips" : "/api/admin/featured-trips";
      const method = values.id ? "PATCH" : "POST";
      const payload = {
        ...values,
        pickupAddressId: toUndef(values.pickupAddressId) ?? pickupAddress?.id,
        summary: toUndef(values.summary),
        badge: toUndef(values.badge),
        zoneLabel: toUndef(values.zoneLabel),
        featuredSlot: toUndef(values.featuredSlot),
        dropoffAddressId: undefined,
        dropoffLabel: undefined,
        heroImageUrl: undefined,
        poiDestinations: cleanedPoi,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        const err =
          typeof json.error === "string"
            ? json.error
            : typeof json?.error?.message === "string"
              ? json.error.message
              : "Enregistrement impossible.";
        setServerError(err);
        logErrors("[FeaturedTrip submit] errors after response");
        return;
      }
      setSuccessMessage(`${values.title || "Trajet"} mis à jour.`);
      form.reset(payload);
      router.refresh();
      router.push("/dashboard/featured-trips");
    } catch (e) {
      setServerError("Erreur réseau. Réessayez.");
    } finally {
      logErrors("[FeaturedTrip submit] errors after submit");
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = form.getValues();
    if (pickupAddress?.id && !raw.pickupAddressId) {
      raw.pickupAddressId = pickupAddress.id;
    }
    raw.dropoffAddressId = undefined;
    (raw as any).dropoffLabel = undefined;
    (raw as any).dropoffAddress = undefined;
    (raw as any).heroImageUrl = undefined;
    void form.handleSubmit(submitCore)(e);
  };

  useEffect(() => {
    // Reset dismissal when the content changes
    setMessageDismissed(false);
  }, [serverError, firstErrorMessage, form.formState.isDirty]);

  useEffect(() => {}, [openTripId]);

  useEffect(() => {
    setTrips(initialTrips);
    setPage(1);
  }, [initialTrips]);

  useEffect(() => {
    if (manualSlug) return;
    form.setValue("slug", slugify(titleValue ?? ""), { shouldDirty: true });
  }, [titleValue, manualSlug, form]);

  useEffect(() => {
    if (page > paged.totalPages) {
      setPage(paged.totalPages);
    }
  }, [page, paged.totalPages]);

  const renderAddressLocked = (title: string, addr: AddressSelection, onEdit: () => void) => {
    if (!addr?.label) return null;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" />
          <div className="text-sm font-semibold text-primary">{addr.label}</div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="cursor-pointer"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </Button>
      </div>
    );
  };

  const tripId = form.getValues("id");

  return (
    <div className="space-y-6">
      {successMessage ? (
        <AppMessage variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </AppMessage>
      ) : null}
      {serverError && !showForm && !messageDismissed ? (
        <AppMessage
          variant="error"
          onClose={() => {
            setServerError(null);
            setMessageDismissed(true);
          }}
        >
          {serverError}
        </AppMessage>
      ) : null}
      {showList && initialTrips.length > 0 ? (
        <Card>
          <CardContent className="space-y-3">
            {paged.items.map((t) => {
              const id = t.id ?? t.slug;
              const isOpen = openTripId === id;
              const pois = Array.isArray(t.poiDestinations) ? t.poiDestinations : [];
              const formatNumber = (v?: number | null) =>
                v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
              const formatPrice = (c?: number | null) =>
                c == null ? "—" : `${(Number(c) / 100).toFixed(2)} €`;
              return (
                <div
                  key={id}
                  ref={(el) => {
                    if (!id) return;
                    listRefs.current[id] = el;
                  }}
                  tabIndex={-1}
                  className="rounded-xl border border-border/70 bg-muted/40"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center justify-between px-3 py-2 cursor-pointer rounded-xl"
                    onClick={() => setOpenTripId((prev) => (prev === id ? null : id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenTripId((prev) => (prev === id ? null : id));
                      }
                    }}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{t.title}</p>
                      <p className="text-sm text-muted-foreground">{t.summary ?? "—"}</p>
                      <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">
                        {t.featuredSlot ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTripId((prev) => (prev === id ? null : id));
                        }}
                      >
                        {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/featured-trips/${t.id}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(t.id ?? id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-border/70 bg-background/70 px-4 py-3 space-y-2">
                      {pois.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune destination.</p>
                      ) : (
                        pois
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((p: any, idx: number) => (
                            <div
                              key={p.id ?? `${id}-poi-${idx}`}
                              className="rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                            >
                              <p className="text-sm font-semibold text-foreground">{p.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Distance: {formatNumber(p.distanceKm)} km · Durée:{" "}
                                {formatNumber(p.durationMinutes)} min · Prix:{" "}
                                {formatPrice(p.priceCents)}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {paged.currentPage} / {paged.totalPages} — {trips.length} trajets
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={paged.currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={paged.currentPage >= paged.totalPages}
                  onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showForm ? (
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {tripId ? "Éditer un trajet mis en avant" : "Créer un trajet mis en avant"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Transfert aéroport"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!manualSlug) {
                                const nextSlug = slugify(e.target.value ?? "");
                                form.setValue("slug", nextSlug, { shouldDirty: true });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="transfert-aeroport"
                            {...field}
                            onFocus={(e) => {
                              setManualSlug(true);
                              (field as any).onFocus?.(e);
                            }}
                            onChange={(e) => {
                              setManualSlug(true);
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="featuredSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emplacement</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(val) => field.onChange(val || null)}
                        >
                          <FormControl>
                            <SelectTrigger className="min-w-[200px]">
                              <SelectValue placeholder="Choisir un slot" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TYPE">Type (Hero)</SelectItem>
                            <SelectItem value="ZONE">Zone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={10000}
                            value={field.value ?? 100}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>Plus petit = plus haut dans la liste.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="badge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge</FormLabel>
                        <FormControl>
                          <Input placeholder="Tarif journée" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zoneLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Libellé zone</FormLabel>
                        <FormControl>
                          <Input placeholder="Nord-Isère" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Résumé</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Description courte" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Switch
                      checked={form.watch("active")}
                      onCheckedChange={(v) =>
                        form.setValue("active", Boolean(v), { shouldDirty: true })
                      }
                      id="active-switch"
                    />
                    <label
                      htmlFor="active-switch"
                      className="text-sm text-foreground cursor-pointer"
                    >
                      Activer ce trajet
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Adresse de départ</FormLabel>
                  </div>
                  <AddressAutocomplete
                    value={pickupAddress?.label ?? form.watch("pickupLabel") ?? ""}
                    placeholder="Chercher une adresse"
                    locked={Boolean(pickupAddress?.label) && !pickupEditing}
                    onRequestEdit={() => setPickupEditing(true)}
                    onChange={(val) => {
                      setPickupEditing(true);
                      form.setValue("pickupLabel", val, { shouldDirty: true });
                    }}
                    onSelect={handlePickupSelect}
                    suppressInitial
                  />
                  <FormMessage />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Destinations POI</h3>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez au moins une destination. Distance, durée et prix se recalculent
                        automatiquement.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={addPoiOpen ? "secondary" : "default"}
                      className="cursor-pointer"
                      onClick={() => setAddPoiOpen((v) => !v)}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une POI
                    </Button>
                  </div>

                  {addPoiOpen ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                          Libellé
                          <Input
                            value={poiDraft.label}
                            onChange={(e) => setPoiDraft((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Ex: Bourgoin-Jallieu"
                            className="mt-1"
                          />
                        </label>
                        <div className="space-y-1 sm:col-span-2">
                          <AddressAutocomplete
                            value={poiDraft.address?.label ?? ""}
                            placeholder="Adresse de destination"
                            onChange={(val) =>
                              setPoiDraft((p) => ({
                                ...p,
                                address: { ...(p.address ?? { lat: NaN, lng: NaN }), label: val },
                              }))
                            }
                            onSelect={(addr) => setPoiDraft((p) => ({ ...p, address: addr }))}
                            suppressInitial
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => void addPoiFromDraft()}
                          disabled={!poiDraft.label.trim() || !poiDraft.address}
                        >
                          Valider la POI
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => setAddPoiOpen(false)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {fields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune destination ajoutée.</p>
                    ) : (
                      fields.map((field, idx) => {
                        const dropoffId = form.watch(`poiDestinations.${idx}.dropoffAddressId`);
                        const poiKey = dropoffId ?? field.id ?? `poi-${idx}`;
                        const addr = poiAddresses[poiKey];
                        const addressLabel = addr?.label ?? "";
                        const hasAddress = Boolean(addr) || Boolean(dropoffId);
                        const locked = hasAddress && !poiInputMode[poiKey];
                        const displayAddress =
                          addressLabel || (hasAddress ? "Adresse sélectionnée" : "");
                        return (
                          <div
                            key={field.id}
                            className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">
                                Destination #{idx + 1}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10 cursor-pointer"
                                  onClick={() => remove(idx)}
                                  aria-label="Supprimer la destination"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`poiDestinations.${idx}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        name="label"
                                        placeholder="Gare de Lyon Part-Dieu"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`poiDestinations.${idx}.dropoffAddressId`}
                                render={() => (
                                  <FormItem>
                                    <FormLabel>Adresse</FormLabel>
                                    <AddressAutocomplete
                                      value={displayAddress}
                                      placeholder="Chercher une adresse"
                                      locked={locked}
                                      onRequestEdit={() =>
                                        setPoiInputMode((prev) => ({ ...prev, [poiKey]: true }))
                                      }
                                      onChange={(val) => {
                                        setPoiAddresses((prev) => ({
                                          ...prev,
                                          [poiKey]: {
                                            ...(prev[poiKey] ?? { lat: NaN, lng: NaN }),
                                            label: val,
                                          },
                                        }));
                                        setPoiInputMode((prev) => ({ ...prev, [poiKey]: true }));
                                      }}
                                      onSelect={(a) => void handlePoiSelect(idx, a)}
                                      suppressInitial
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              <FormField
                                control={form.control}
                                name={`poiDestinations.${idx}.distanceKm`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Distance (km)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        readOnly
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`poiDestinations.${idx}.durationMinutes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Durée (min)</FormLabel>
                                    <FormControl>
                                      <Input type="number" readOnly value={field.value ?? ""} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`poiDestinations.${idx}.priceCents`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Prix (€)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        readOnly
                                        value={
                                          field.value != null ? Math.round(field.value) / 100 : ""
                                        }
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end border-t border-border/70 pt-4">
                  <Button
                    type="submit"
                    className="cursor-pointer"
                    disabled={form.formState.isSubmitting}
                    onClick={() => {
                      if (process.env.NODE_ENV !== "production") {
                        console.log("[FeaturedTrip] submit click", {
                          saving,
                          isSubmitting: form.formState.isSubmitting,
                          isDirty: form.formState.isDirty,
                          hasErrors: Object.keys(form.formState.errors ?? {}).length > 0,
                        });
                      }
                    }}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {tripId ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
                {(serverError || (form.formState.isDirty && firstErrorMessage)) &&
                !messageDismissed ? (
                  <div className="pt-2 text-right">
                    <AppMessage
                      variant="error"
                      onClose={() => {
                        setServerError(null);
                        setMessageDismissed(true);
                        if (process.env.NODE_ENV !== "production") {
                          logErrors("[FeaturedTrip] manual dismiss errors");
                        }
                      }}
                    >
                      {serverError ?? firstErrorMessage}
                    </AppMessage>
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="pt-2 text-right">
                    <AppMessage variant="success" onClose={() => setSuccessMessage(null)}>
                      {successMessage}
                    </AppMessage>
                  </div>
                ) : null}
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Supprimer ce trajet ?"
        message="Cette action est définitive. Les destinations associées seront supprimées."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          const id = confirmDeleteId;
          if (!id) return;
          try {
            const res = await fetch("/api/admin/featured-trips", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            if (!res.ok) {
              setServerError("Suppression impossible.");
              return;
            }
            setTrips((prev) => prev.filter((x) => x.id !== id));
            const removedTitle = trips.find((t) => t.id === id)?.title ?? "Trajet";
            setSuccessMessage(`${removedTitle} supprimé.`);
            if (openTripId === id) setOpenTripId(null);
          } catch {
            setServerError("Erreur réseau lors de la suppression.");
          } finally {
            setConfirmDeleteId(null);
          }
        }}
      />
    </div>
  );
}
