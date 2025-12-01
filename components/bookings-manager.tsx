"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Booking, Address } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  haversineKm,
  inferTariffFromDateTime,
  type Coord,
  parseAddressParts,
  fetchAddressData,
  type AddressData,
} from "@/lib/booking-utils";
import {
  computePriceEuros,
  defaultTariffConfig,
  type TariffCode,
  type TariffConfigValues,
} from "@/lib/tarifs";

type BookingWithPrice = Pick<
  Booking,
  | "id"
  | "dateTime"
  | "pax"
  | "luggage"
  | "notes"
  | "priceCents"
  | "status"
  | "userId"
  | "driverId"
  | "babySeat"
  | "pickupId"
  | "dropoffId"
  | "createdAt"
  | "updatedAt"
> & {
  dateTime: Date | string;
  pickup: Address | null;
  dropoff: Address | null;
};

type EditForm = {
  pickup: AddressData;
  dropoff: AddressData;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  notes: string;
};

type Suggestion = AddressData;

const formatAddressLabel = (addr: Address | AddressData | null) => {
  if (!addr) return "";
  if ("label" in addr && addr.label) return addr.label;
  if ("name" in addr && addr.name) return addr.name;
  const parts = [
    "streetNumber" in addr ? addr.streetNumber : null,
    "street" in addr ? addr.street : null,
    "postalCode" in addr ? addr.postalCode : null,
    "city" in addr ? addr.city : null,
    "country" in addr ? addr.country : null,
  ].filter(Boolean);
  return parts.join(" ");
};

const toForm = (booking: BookingWithPrice): EditForm => {
  const parsed = booking.dateTime instanceof Date ? booking.dateTime : new Date(booking.dateTime);
  const iso = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  const [date, timeRaw] = iso.split("T");
  const time = timeRaw.slice(0, 5);
  const pickup: AddressData = {
    label: formatAddressLabel(booking.pickup),
    lat: booking.pickup?.latitude ?? NaN,
    lng: booking.pickup?.longitude ?? NaN,
    city: booking.pickup?.city ?? undefined,
    postcode: booking.pickup?.postalCode ?? undefined,
    country: booking.pickup?.country ?? undefined,
    street: booking.pickup?.street ?? undefined,
    streetNumber: booking.pickup?.streetNumber ?? undefined,
  };
  const dropoff: AddressData = {
    label: formatAddressLabel(booking.dropoff),
    lat: booking.dropoff?.latitude ?? NaN,
    lng: booking.dropoff?.longitude ?? NaN,
    city: booking.dropoff?.city ?? undefined,
    postcode: booking.dropoff?.postalCode ?? undefined,
    country: booking.dropoff?.country ?? undefined,
    street: booking.dropoff?.street ?? undefined,
    streetNumber: booking.dropoff?.streetNumber ?? undefined,
  };
  return {
    pickup,
    dropoff,
    date,
    time,
    passengers: booking.pax,
    luggage: booking.luggage,
    notes: booking.notes ?? "",
  };
};

const statusLabel = (status: Booking["status"]) => {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "CONFIRMED":
      return "Confirmée";
    case "COMPLETED":
      return "Terminée";
    default:
      return "Annulée";
  }
};

const statusTone = (status: Booking["status"]) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-800";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-rose-100 text-rose-800";
  }
};

export function BookingsManager({ initialBookings }: { initialBookings: BookingWithPrice[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);
  const [fromCoords, setFromCoords] = useState<Coord | null>(null);
  const [toCoords, setToCoords] = useState<Coord | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingWithPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tariffConfig, setTariffConfig] = useState<TariffConfigValues>(defaultTariffConfig);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/tarifs/config", { cache: "no-store" });
        if (!res.ok) return;
        const cfg = (await res.json()) as TariffConfigValues;
        setTariffConfig(cfg);
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const searchPhoton = async (text: string, kind: "from" | "to") => {
    if (text.length < 3) {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(text)}`);
      const data = (await res.json()) as { results?: Suggestion[] };
      const normalized =
        data.results?.map((s) => {
          const parsed = parseAddressParts(s.label);
          const withCountry =
            s.country && !s.label.toLowerCase().includes(s.country.toLowerCase())
              ? `${s.label}, ${s.country}`
              : s.label;
          return {
            ...s,
            label: withCountry,
            city: s.city ?? parsed.city,
            postcode: s.postcode ?? parsed.cp,
            street: parsed.street,
            streetNumber: parsed.streetNumber,
          };
        }) ?? [];
      if (kind === "from") setFromSuggestions(normalized);
      else setToSuggestions(normalized);
    } catch {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
    }
  };

  const resolveAddress = async (
    address: AddressData,
    kind: "from" | "to"
  ): Promise<AddressData> => {
    if (Number.isFinite(address.lat) && Number.isFinite(address.lng)) {
      if (kind === "from") setFromCoords({ lat: address.lat, lng: address.lng });
      else setToCoords({ lat: address.lat, lng: address.lng });
      return address;
    }
    const fetched = await fetchAddressData(address.label);
    const merged: AddressData = { ...address, ...fetched };
    if (kind === "from")
      setFromCoords(
        Number.isFinite(merged.lat) && Number.isFinite(merged.lng)
          ? { lat: merged.lat, lng: merged.lng }
          : null
      );
    else
      setToCoords(
        Number.isFinite(merged.lat) && Number.isFinite(merged.lng)
          ? { lat: merged.lat, lng: merged.lng }
          : null
      );
    return merged;
  };

  const pickSuggestion = (s: Suggestion, kind: "from" | "to") => {
    const target =
      kind === "from" ? { ...s, lat: s.lat, lng: s.lng } : { ...s, lat: s.lat, lng: s.lng };
    const parsed = parseAddressParts(s.label);
    const merged: AddressData = {
      ...target,
      city: target.city ?? parsed.city,
      postcode: target.postcode ?? parsed.cp,
      street: target.street ?? parsed.street,
      streetNumber: target.streetNumber ?? parsed.streetNumber,
    };
    setForm((prev) =>
      prev
        ? {
            ...prev,
            [kind === "from" ? "pickup" : "dropoff"]: merged,
          }
        : prev
    );
    if (kind === "from") {
      setFromCoords({ lat: merged.lat, lng: merged.lng });
      setFromSuggestions([]);
    } else {
      setToCoords({ lat: merged.lat, lng: merged.lng });
      setToSuggestions([]);
    }
  };

  const startEdit = useCallback((booking: BookingWithPrice) => {
    const formValue = toForm(booking);
    setEditingId(booking.id);
    setForm(formValue);
    setFromCoords(
      Number.isFinite(formValue.pickup.lat) && Number.isFinite(formValue.pickup.lng)
        ? { lat: formValue.pickup.lat, lng: formValue.pickup.lng }
        : null
    );
    setToCoords(
      Number.isFinite(formValue.dropoff.lat) && Number.isFinite(formValue.dropoff.lng)
        ? { lat: formValue.dropoff.lat, lng: formValue.dropoff.lng }
        : null
    );
    setPrice(booking.priceCents ? booking.priceCents / 100 : null);
    setDistance("");
    setDuration("");
    setError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(null);
    setFromSuggestions([]);
    setToSuggestions([]);
    setFromCoords(null);
    setToCoords(null);
    setPrice(null);
    setDistance("");
    setDuration("");
  }, []);

  const calculatePrice = async () => {
    if (!form) return;
    setLoadingId(editingId);
    setError(null);
    try {
      const from = await resolveAddress(form.pickup, "from");
      const to = await resolveAddress(form.dropoff, "to");
      const tariff = inferTariffFromDateTime(form.date, form.time) as TariffCode;

      const res = await fetch("/api/tarifs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: from.lat, lng: from.lng },
          to: { lat: to.lat, lng: to.lng },
          tariff,
          baggageCount: form.luggage,
          fifthPassenger: form.passengers > 4,
          waitMinutes: 0,
        }),
      });
      const payload = await res.json();
      const distanceKm = Number(payload.distanceKm);
      const durationMinutes = Number(payload.durationMinutes);
      const apiPrice = Number(payload.price);
      const finalDistance = Number.isFinite(distanceKm) ? distanceKm : haversineKm(from, to);
      const finalPrice =
        Number.isFinite(apiPrice) && apiPrice > 0
          ? apiPrice
          : computePriceEuros(
              finalDistance,
              tariff,
              {
                baggageCount: form.luggage,
                fifthPassenger: form.passengers > 4,
                waitMinutes: 0,
              },
              tariffConfig
            );

      setForm((prev) =>
        prev
          ? {
              ...prev,
              pickup: from,
              dropoff: to,
            }
          : prev
      );
      setFromCoords({ lat: from.lat, lng: from.lng });
      setToCoords({ lat: to.lat, lng: to.lng });

      setPrice(finalPrice);
      setDistance(finalDistance ? finalDistance.toFixed(2) : "");
      setDuration(Number.isFinite(durationMinutes) ? String(Math.round(durationMinutes)) : "");
    } catch (e) {
      setError("Erreur lors du calcul du tarif : " + String(e));
    } finally {
      setLoadingId(null);
    }
  };

  const save = async (booking: BookingWithPrice) => {
    if (!form) return;
    setLoadingId(booking.id);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          pickup: form.pickup,
          dropoff: form.dropoff,
          date: form.date,
          time: form.time,
          passengers: form.passengers,
          luggage: form.luggage,
          notes: form.notes,
          estimatedPrice: price ?? (booking.priceCents ? booking.priceCents / 100 : undefined),
        }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      const payload = await res.json();
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, ...payload.booking } : b))
      );
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoadingId(null);
    }
  };

  const remove = async (booking: BookingWithPrice) => {
    setLoadingId(booking.id);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id }),
      });
      if (!res.ok) throw new Error("Échec de la suppression");
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoadingId(null);
    }
  };

  const formattedBookings = useMemo(() => bookings, [bookings]);

  return (
    <div className="space-y-4">
      {formattedBookings.map((booking) => {
        const isEditing = booking.id === editingId;
        const formValues = isEditing ? (form ?? toForm(booking)) : null;
        const priceToShow =
          isEditing && price !== null
            ? price
            : booking.priceCents
              ? booking.priceCents / 100
              : null;

        return (
          <div
            key={booking.id}
            className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatAddressLabel(booking.pickup)} → {formatAddressLabel(booking.dropoff)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statusLabel(booking.status)} •{" "}
                  {new Date(booking.dateTime).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • {booking.pax} pax • {booking.luggage} bagages
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                    statusTone(booking.status)
                  )}
                >
                  {statusLabel(booking.status)}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {priceToShow !== null ? `${priceToShow.toFixed(2)} €` : "—"}
                </p>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Départ
                    </p>
                    <input
                      type="hidden"
                      value={fromCoords?.lat ?? formValues?.pickup.lat ?? ""}
                      readOnly
                    />
                    <input
                      type="hidden"
                      value={fromCoords?.lng ?? formValues?.pickup.lng ?? ""}
                      readOnly
                    />
                    <Input
                      value={formValues?.pickup.label ?? ""}
                      onChange={(e) => {
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                pickup: {
                                  ...prev.pickup,
                                  label: e.target.value,
                                  lat: NaN,
                                  lng: NaN,
                                },
                              }
                            : prev
                        );
                        void searchPhoton(e.target.value, "from");
                      }}
                      placeholder="Prise en charge"
                    />
                    {fromSuggestions.length > 0 ? (
                      <div className="relative">
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
                          {fromSuggestions.map((s, idx) => (
                            <button
                              key={`${s.lat}-${s.lng}-${s.label}-${idx}`}
                              type="button"
                              className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60"
                              onClick={() => pickSuggestion(s, "from")}
                            >
                              <span className="truncate">{s.label}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {[s.city, s.postcode, s.country].filter(Boolean).join(" • ")}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <div>
                        <label className="text-xs text-muted-foreground">Rue / n°</label>
                        <Input
                          readOnly
                          value={
                            formValues?.pickup.street || formValues?.pickup.streetNumber || "Auto"
                          }
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Code postal</label>
                        <Input
                          readOnly
                          value={formValues?.pickup.postcode || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Ville</label>
                        <Input
                          readOnly
                          value={formValues?.pickup.city || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Pays</label>
                        <Input
                          readOnly
                          value={formValues?.pickup.country || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      Arrivée
                    </p>
                    <input
                      type="hidden"
                      value={toCoords?.lat ?? formValues?.dropoff.lat ?? ""}
                      readOnly
                    />
                    <input
                      type="hidden"
                      value={toCoords?.lng ?? formValues?.dropoff.lng ?? ""}
                      readOnly
                    />
                    <Input
                      value={formValues?.dropoff.label ?? ""}
                      onChange={(e) => {
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                dropoff: {
                                  ...prev.dropoff,
                                  label: e.target.value,
                                  lat: NaN,
                                  lng: NaN,
                                },
                              }
                            : prev
                        );
                        void searchPhoton(e.target.value, "to");
                      }}
                      placeholder="Destination"
                    />
                    {toSuggestions.length > 0 ? (
                      <div className="relative">
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
                          {toSuggestions.map((s, idx) => (
                            <button
                              key={`${s.lat}-${s.lng}-${s.label}-${idx}`}
                              type="button"
                              className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60"
                              onClick={() => pickSuggestion(s, "to")}
                            >
                              <span className="truncate">{s.label}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {[s.city, s.postcode, s.country].filter(Boolean).join(" • ")}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <div>
                        <label className="text-xs text-muted-foreground">Rue / n°</label>
                        <Input
                          readOnly
                          value={
                            formValues?.dropoff.street || formValues?.dropoff.streetNumber || "Auto"
                          }
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Code postal</label>
                        <Input
                          readOnly
                          value={formValues?.dropoff.postcode || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Ville</label>
                        <Input
                          readOnly
                          value={formValues?.dropoff.city || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Pays</label>
                        <Input
                          readOnly
                          value={formValues?.dropoff.country || "Auto"}
                          className="bg-muted/50 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <Input
                      type="date"
                      value={formValues?.date ?? ""}
                      onChange={(e) =>
                        setForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Heure</label>
                    <Input
                      type="time"
                      value={formValues?.time ?? ""}
                      onChange={(e) =>
                        setForm((prev) => (prev ? { ...prev, time: e.target.value } : prev))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Passagers</label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={formValues?.passengers ?? 1}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, passengers: Number(e.target.value) || 1 } : prev
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Bagages</label>
                    <Input
                      type="number"
                      min={0}
                      max={6}
                      value={formValues?.luggage ?? 0}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, luggage: Number(e.target.value) || 0 } : prev
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <Textarea
                    value={formValues?.notes ?? ""}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                    }
                  />
                </div>

                {distance || duration ? (
                  <p className="text-sm text-muted-foreground">
                    Distance: {distance || "—"} km • Durée: {duration || "—"} min • Prix estimé:{" "}
                    {price !== null ? `${price.toFixed(2)} €` : "—"}
                  </p>
                ) : null}

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={calculatePrice}
                    disabled={loadingId === booking.id}
                  >
                    Recalculer le tarif
                  </Button>
                  <Button
                    type="button"
                    onClick={() => save(booking)}
                    disabled={loadingId === booking.id}
                  >
                    Enregistrer
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {priceToShow !== null ? <span>{priceToShow.toFixed(2)} €</span> : null}
                <Button size="sm" variant="ghost" onClick={() => startEdit(booking)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setPendingDelete(booking)}
                >
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer la réservation ?"
        message="Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
