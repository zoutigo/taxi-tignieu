"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, Address } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { paginateArray, loadPaginationSettings } from "@/lib/pagination";

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

export function BookingsManager({ initialBookings }: { initialBookings: BookingWithPrice[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BookingWithPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(() => loadPaginationSettings().bookings);

  const formattedBookings = useMemo(() => {
    const paged = paginateArray(bookings, page, pageSize);
    if (paged.currentPage !== page) {
      setPage(paged.currentPage);
    }
    return paged;
  }, [bookings, page, pageSize]);

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

  useEffect(() => {
    if (formattedBookings.totalPages < page) {
      setPage(formattedBookings.totalPages);
    }
  }, [formattedBookings.totalPages, page]);

  return (
    <div className="space-y-4">
      {formattedBookings.items.map((booking) => {
        const priceToShow = booking.priceCents ? booking.priceCents / 100 : null;

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

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {priceToShow !== null ? (
                <span className="font-semibold text-foreground">{priceToShow.toFixed(2)} €</span>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/espace-client/bookings/${booking.id}/edit`)}
                className="cursor-pointer"
              >
                Modifier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive cursor-pointer"
                onClick={() => setPendingDelete(booking)}
                disabled={loadingId === booking.id}
              >
                Supprimer
              </Button>
            </div>
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
