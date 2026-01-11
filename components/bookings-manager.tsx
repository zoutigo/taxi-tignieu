"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, Address, BookingNote, Invoice } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  paginateArray,
  loadPaginationSettings,
  savePaginationSettings,
  paginationDefaults,
} from "@/lib/pagination";
import { Pencil, Trash2 } from "lucide-react";

type BookingWithPrice = Pick<
  Booking,
  | "id"
  | "dateTime"
  | "pax"
  | "luggage"
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
  bookingNotes?: (BookingNote & { author?: { name?: string | null } | null })[];
  notes?: string | null;
  invoice?: Invoice | null;
  driverName?: string | null;
  driverPhone?: string | null;
};

const formatAddressLabel = (addr: Address | null) => {
  if (!addr) return "";
  if (addr.name) return addr.name;
  const parts = [addr.streetNumber, addr.street, addr.postalCode, addr.city, addr.country].filter(
    Boolean
  );
  return parts.join(" ");
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

const cardBorderTone = (status: Booking["status"]) => {
  switch (status) {
    case "PENDING":
      return "border-primary/60";
    case "CONFIRMED":
      return "border-emerald-300";
    case "COMPLETED":
      return "border-blue-200";
    case "CANCELLED":
      return "border-destructive/40 bg-destructive/5";
    default:
      return "border-border/70";
  }
};

export function BookingsManager({ initialBookings }: { initialBookings: BookingWithPrice[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingWithPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(paginationDefaults.bookings);
  const [cancelNote, setCancelNote] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{
    id: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const formattedBookings = useMemo(
    () => paginateArray(bookings, page, pageSize),
    [bookings, page, pageSize]
  );

  useEffect(() => {
    const paged = paginateArray(bookings, page, pageSize);
    if (paged.currentPage !== page) {
      setPage(paged.currentPage);
    }
  }, [bookings, page, pageSize]);

  useEffect(() => {
    const stored = loadPaginationSettings().bookings;
    if (stored && stored !== pageSize) {
      setPageSize(stored);
    }
  }, [pageSize]);

  const handlePageSizeChange = (value: number) => {
    const safe = Math.max(1, Number.isFinite(value) ? value : 1);
    setPageSize(safe);
    setPage(1);
    const current = loadPaginationSettings();
    savePaginationSettings({ ...current, bookings: safe });
  };

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const remove = async (booking: BookingWithPrice) => {
    setLoadingId(booking.id);
    setError(null);
    setFeedback(null);
    const note = cancelNote[booking.id]?.trim();
    if (!note) {
      setError("Merci d'ajouter un motif d'annulation.");
      setLoadingId(null);
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, note }),
      });
      if (!res.ok) throw new Error("Échec de l'annulation");
      const payload = (await res.json()) as { booking?: BookingWithPrice };
      if (payload.booking) {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? { ...b, ...payload.booking } : b))
        );
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? { ...b, status: "CANCELLED" } : b))
        );
      }
      setFeedback({ id: booking.id, type: "success", text: "Réservation annulée avec succès." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setFeedback({
        id: booking.id,
        type: "error",
        text: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setLoadingId(null);
      setPendingDelete(null);
      setCancelNote((prev) => ({ ...prev, [booking.id]: "" }));
    }
  };

  useEffect(() => {
    if (formattedBookings.totalPages < page) {
      setPage(formattedBookings.totalPages);
    }
  }, [formattedBookings.totalPages, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Éléments par page</span>
          <input
            type="number"
            min={1}
            className="h-9 w-20 rounded-md border border-border px-2"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border/70 bg-muted px-3 py-1 text-sm disabled:opacity-50"
            disabled={formattedBookings.currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <span className="text-muted-foreground">
            Page {formattedBookings.currentPage} / {formattedBookings.totalPages}
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border/70 bg-muted px-3 py-1 text-sm disabled:opacity-50"
            disabled={formattedBookings.currentPage >= formattedBookings.totalPages}
            onClick={() => setPage((p) => Math.min(formattedBookings.totalPages, p + 1))}
          >
            Suivant
          </button>
        </div>
      </div>

      {formattedBookings.items.map((booking) => {
        const priceToShow = booking.priceCents ? booking.priceCents / 100 : null;

        return (
          <div
            key={booking.id}
            className={cn(
              "rounded-2xl border bg-card px-5 py-4 shadow-sm",
              cardBorderTone(booking.status)
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatAddressLabel(booking.pickup)} → {formatAddressLabel(booking.dropoff)}
                </p>
                <p className="text-xs text-muted-foreground">
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
                <p className="text-sm font-semibold text-foreground">
                  {priceToShow !== null ? `${priceToShow.toFixed(2)} €` : "—"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">(Prix estimé)</span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                  statusTone(booking.status)
                )}
              >
                {statusLabel(booking.status)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer flex items-center gap-2 text-foreground"
                onClick={() =>
                  setDetailsOpen((prev) => ({ ...prev, [booking.id]: !prev[booking.id] }))
                }
              >
                <span className="hidden md:inline">Détails</span>
              </Button>
              {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/espace-client/bookings/${booking.id}/edit`)}
                  className="cursor-pointer flex items-center gap-2 text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden md:inline">Modifier</span>
                </Button>
              ) : null}
              {booking.status !== "COMPLETED" &&
              booking.status !== "CANCELLED" &&
              !booking.invoice ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive cursor-pointer flex items-center gap-2"
                  onClick={() => setPendingDelete(booking)}
                  disabled={loadingId === booking.id}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden md:inline">Annuler</span>
                </Button>
              ) : null}
            </div>
            {error && pendingDelete?.id === booking.id ? (
              <div className="mt-3 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {feedback?.id === booking.id && feedback.type === "success" ? (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {feedback.text}
              </div>
            ) : null}
            {error && pendingDelete?.id === booking.id ? (
              <div className="mt-3 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {detailsOpen[booking.id] ? (
              <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-semibold text-foreground">Détails</p>
                <p className="text-muted-foreground">Réservation : {booking.id}</p>
                <p className="text-muted-foreground">
                  Chauffeur :{" "}
                  {booking.driverName
                    ? `${booking.driverName}${booking.driverPhone ? ` (${booking.driverPhone})` : ""}`
                    : "Non assigné"}
                </p>
                {booking.bookingNotes && booking.bookingNotes.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {booking.bookingNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-md border border-border/60 bg-background p-2"
                      >
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString("fr-FR")}
                          {note.author?.name ? ` · ${note.author.name}` : ""}
                        </p>
                        <p className="text-foreground">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucune note.</p>
                )}
              </div>
            ) : null}
            {pendingDelete?.id === booking.id ? (
              <div className="mt-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm">
                <p className="text-destructive font-semibold">Confirmer l&apos;annulation</p>
                <p className="text-muted-foreground">
                  Ajoutez un motif (obligatoire) avant d&apos;annuler cette réservation.
                </p>
                <textarea
                  className="mt-2 w-full rounded-md border border-border/70 bg-background p-2 text-foreground"
                  value={cancelNote[booking.id] ?? ""}
                  onChange={(e) =>
                    setCancelNote((prev) => ({ ...prev, [booking.id]: e.target.value }))
                  }
                  placeholder="Motif d'annulation..."
                  rows={3}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => remove(booking)}
                    disabled={loadingId === booking.id || !cancelNote[booking.id]?.trim()}
                  >
                    Annuler la réservation
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => {
                      setPendingDelete(null);
                      setCancelNote((prev) => ({ ...prev, [booking.id]: "" }));
                    }}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {formattedBookings.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <div>
            Page {formattedBookings.currentPage} / {formattedBookings.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={formattedBookings.currentPage <= 1}
              className="cursor-pointer"
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => Math.min(formattedBookings.totalPages, p + 1))}
              disabled={formattedBookings.currentPage >= formattedBookings.totalPages}
              className="cursor-pointer"
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
