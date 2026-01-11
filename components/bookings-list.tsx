"use client";

import { useState, useMemo, useCallback } from "react";
import type { Booking, Address, BookingNote } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type BookingWithPrice = Omit<Booking, "dateTime"> & {
  dateTime: Date | string;
  pickup: Address | string | null;
  dropoff: Address | string | null;
  bookingNotes?: BookingNote[];
};

type EditForm = {
  pickup: string | Address;
  dropoff: string | Address;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  notes: string;
};

const formatAddress = (value: string | Address | null) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.name) return value.name;
  const parts = [
    value.streetNumber,
    value.street,
    value.postalCode,
    value.city,
    value.country,
  ].filter(Boolean);
  return parts.join(" ");
};

function toForm(booking: BookingWithPrice): EditForm {
  const parsed = booking.dateTime instanceof Date ? booking.dateTime : new Date(booking.dateTime);
  const iso = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  const [date, timeRaw] = iso.split("T");
  const time = timeRaw.slice(0, 5);
  return {
    pickup: booking.pickup ?? "",
    dropoff: booking.dropoff ?? "",
    date,
    time,
    passengers: booking.pax,
    luggage: booking.luggage,
    notes:
      booking.bookingNotes && booking.bookingNotes.length
        ? (booking.bookingNotes[booking.bookingNotes.length - 1]?.content ?? "")
        : "",
  };
}

const statusClass = (status: Booking["status"]) => {
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

function formatDate(date: Date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

type Props = {
  initialBookings: BookingWithPrice[];
};

export function BookingsList({ initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingWithPrice | null>(null);

  const handleEdit = useCallback((booking: BookingWithPrice) => {
    setEditingId(booking.id);
    setForm(toForm(booking));
    setError(null);
  }, []);

  const handleChange = useCallback((field: keyof EditForm, value: string | number) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const handleSave = useCallback(
    async (booking: BookingWithPrice) => {
      if (!form) return;
      setLoadingId(booking.id);
      setError(null);
      try {
        const res = await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: booking.id,
            pickup:
              typeof form.pickup === "string"
                ? { label: form.pickup, lat: NaN, lng: NaN }
                : {
                    label: formatAddress(form.pickup),
                    lat: form.pickup.latitude ?? NaN,
                    lng: form.pickup.longitude ?? NaN,
                    city: form.pickup.city ?? undefined,
                    postcode: form.pickup.postalCode ?? undefined,
                    country: form.pickup.country ?? undefined,
                  },
            dropoff:
              typeof form.dropoff === "string"
                ? { label: form.dropoff, lat: NaN, lng: NaN }
                : {
                    label: formatAddress(form.dropoff),
                    lat: form.dropoff.latitude ?? NaN,
                    lng: form.dropoff.longitude ?? NaN,
                    city: form.dropoff.city ?? undefined,
                    postcode: form.dropoff.postalCode ?? undefined,
                    country: form.dropoff.country ?? undefined,
                  },
            date: form.date,
            time: form.time,
            passengers: form.passengers,
            luggage: form.luggage,
            notes: form.notes,
          }),
        });
        if (!res.ok) {
          throw new Error("Échec de la mise à jour");
        }
        const payload = await res.json();
        setBookings((prev) =>
          prev.map((b) =>
            b.id === booking.id
              ? {
                  ...b,
                  ...payload.booking,
                  notes:
                    payload.booking.bookingNotes?.[payload.booking.bookingNotes.length - 1]
                      ?.content ?? "",
                }
              : b
          )
        );
        setEditingId(null);
        setForm(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoadingId(null);
      }
    },
    [form]
  );

  const handleDelete = useCallback(async (booking: BookingWithPrice) => {
    setLoadingId(booking.id);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id }),
      });
      if (!res.ok) {
        throw new Error("Échec de la suppression");
      }
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const cards = useMemo(() => bookings, [bookings]);

  return (
    <div className="grid gap-4">
      {cards.map((booking) => {
        const isEditing = editingId === booking.id;
        const formValues = isEditing ? (form ?? toForm(booking)) : null;
        return (
          <div
            key={booking.id}
            className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatAddress(booking.pickup)} → {formatAddress(booking.dropoff)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(
                    booking.dateTime instanceof Date ? booking.dateTime : new Date(booking.dateTime)
                  )}{" "}
                  • {booking.pax} pax • {booking.luggage} bagages
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(booking.status)}`}
                >
                  {statusLabel(booking.status)}
                </p>
                <p className="mt-1 text-xs">
                  {booking.priceCents ? `${(booking.priceCents / 100).toFixed(0)} €` : "—"}
                </p>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input
                  value={formatAddress(formValues?.pickup ?? "")}
                  onChange={(e) => handleChange("pickup", e.target.value)}
                  placeholder="Prise en charge"
                />
                <Input
                  value={formatAddress(formValues?.dropoff ?? "")}
                  onChange={(e) => handleChange("dropoff", e.target.value)}
                  placeholder="Destination"
                />
                <Input
                  type="date"
                  value={formValues?.date ?? ""}
                  onChange={(e) => handleChange("date", e.target.value)}
                />
                <Input
                  type="time"
                  value={formValues?.time ?? ""}
                  onChange={(e) => handleChange("time", e.target.value)}
                />
                <Input
                  type="number"
                  value={formValues?.passengers ?? 1}
                  onChange={(e) => handleChange("passengers", Number(e.target.value))}
                  min={1}
                  max={7}
                />
                <Input
                  type="number"
                  value={formValues?.luggage ?? 0}
                  onChange={(e) => handleChange("luggage", Number(e.target.value))}
                  min={0}
                  max={6}
                />
                <Textarea
                  className="sm:col-span-2"
                  value={formValues?.notes ?? ""}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Notes"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    onClick={() => handleSave(booking)}
                    disabled={loadingId === booking.id}
                    className="btn btn-primary"
                  >
                    {loadingId === booking.id ? "Enregistrement..." : "Sauvegarder"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm(null);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(booking)}
                  disabled={loadingId === booking.id}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDelete(booking)}
                  disabled={loadingId === booking.id}
                >
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cette réservation ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await handleDelete(pendingDelete);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
