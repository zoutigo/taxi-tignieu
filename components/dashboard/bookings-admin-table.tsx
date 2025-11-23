"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, BookingStatus, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, PhoneCall, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadPaginationSettings, paginateArray, savePaginationSettings } from "@/lib/pagination";

type Driver = Pick<User, "id" | "name" | "email" | "phone">;

type BookingRow = Booking & {
  user?: { name: string | null; email: string | null; phone: string | null } | null;
  customer?: { fullName: string; phone: string; email: string | null } | null;
  driver?: Driver | null;
  driverId?: string | null;
};

type CurrentUser = {
  id?: string;
  isAdmin?: boolean;
  isManager?: boolean;
  isDriver?: boolean;
};

type Props = {
  initialBookings: BookingRow[];
  drivers: Driver[];
  currentUser: CurrentUser | null;
};

const statusLabel: Record<BookingStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("fr-FR")} · ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export function BookingsAdminTable({ initialBookings, drivers, currentUser }: Props) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [transferTarget, setTransferTarget] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => loadPaginationSettings().bookings);

  const adminLike = Boolean(currentUser?.isAdmin || currentUser?.isManager);
  const driverLike = Boolean(currentUser?.isDriver);

  const driverOptions = useMemo(
    () =>
      drivers.map((d) => ({
        ...d,
        label: d.name ?? d.email ?? d.phone ?? d.id,
      })),
    [drivers]
  );

  const filtered = useMemo(
    () => bookings.filter((b) => (statusFilter === "ALL" ? true : b.status === statusFilter)),
    [bookings, statusFilter]
  );
  const {
    items: pageBookings,
    totalPages,
    currentPage,
  } = useMemo(() => paginateArray(filtered, page, pageSize), [filtered, page, pageSize]);
  useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateLocal = (updated: BookingRow) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const patchBooking = async (payload: Partial<BookingRow> & { id: number }) => {
    setError(null);
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { booking?: BookingRow; error?: string };
    if (!res.ok) {
      throw new Error(body?.error ?? "Impossible de mettre à jour la réservation.");
    }
    return body.booking ?? payload;
  };

  const handleSave = async (b: BookingRow) => {
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        pickup: b.pickup,
        dropoff: b.dropoff,
        notes: b.notes ?? "",
        status: b.status,
        priceCents: b.priceCents ?? undefined,
      });
      updateLocal(updated as BookingRow);
      setMessage("Réservation mise à jour.");
      setEditingId(null);
      setTimeout(() => setMessage(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de sauvegarder la réservation.");
    } finally {
      setSavingId(null);
    }
  };

  const handleClaim = async (b: BookingRow) => {
    if (!currentUser?.id) {
      setError("Connexion requise pour prendre la course.");
      return;
    }
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        driverId: currentUser.id,
        status: "CONFIRMED",
      });
      updateLocal(updated as BookingRow);
      setMessage("Course prise");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de prendre la course.");
    } finally {
      setSavingId(null);
    }
  };

  const handleRelease = async (b: BookingRow) => {
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        driverId: null,
        status: "PENDING",
      });
      updateLocal(updated as BookingRow);
      setMessage("Course libérée");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de libérer la course.");
    } finally {
      setSavingId(null);
    }
  };

  const handleTransfer = async (b: BookingRow) => {
    const target = transferTarget[b.id];
    if (!target) {
      setError("Choisissez un chauffeur.");
      return;
    }
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        driverId: target,
        status: "CONFIRMED",
      });
      updateLocal(updated as BookingRow);
      setMessage("Course transférée");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfert impossible.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 text-sm">
          {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(s === "ALL" ? "ALL" : (s as BookingStatus));
                setPage(1);
              }}
            >
              {s === "ALL" ? "Tous" : statusLabel[s as BookingStatus]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span>Éléments par page</span>
        <Input
          type="number"
          min={1}
          className="h-9 w-20"
          value={pageSize}
          onChange={(e) => {
            const val = Math.max(1, Number(e.target.value) || 1);
            setPageSize(val);
            const next = loadPaginationSettings();
            savePaginationSettings({ ...next, bookings: val });
            setPage(1);
          }}
        />
      </div>

      {pageBookings.map((b) => {
        const clientName = b.user?.name ?? b.customer?.fullName ?? "—";
        const clientPhone = b.user?.phone ?? b.customer?.phone ?? "—";
        const clientEmail = b.user?.email ?? b.customer?.email ?? "—";
        const assignedToMe = b.driver?.id && currentUser?.id === b.driver.id;
        const isTaken = Boolean(b.driver?.id);
        const dateValue =
          b.dateTime instanceof Date ? b.dateTime.toISOString() : (b.dateTime as unknown as string);
        const priceLabel = b.priceCents != null ? `${(b.priceCents / 100).toFixed(0)} €` : "—";

        return (
          <div
            key={b.id}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {formatDateTime(dateValue)}
                </p>
                <p className="text-base font-semibold text-foreground">{priceLabel}</p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">Départ : {b.pickup}</p>
                <p className="font-semibold text-foreground">Arrivée : {b.dropoff}</p>
              </div>

              <p className="text-sm font-medium text-foreground">{clientName}</p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {clientPhone !== "—" ? (
                  <a
                    href={`tel:${clientPhone}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary transition hover:bg-primary/10"
                    aria-label={`Appeler ${clientPhone}`}
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span>{clientPhone}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                {clientEmail !== "—" ? (
                  <a
                    href={`mailto:${clientEmail}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary transition hover:bg-primary/10"
                    aria-label={`Écrire à ${clientEmail}`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>{clientEmail}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                {adminLike ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="flex items-center gap-2 rounded-full bg-sidebar px-4 py-2 text-sidebar-foreground hover:bg-sidebar/80"
                    onClick={() => setEditingId((prev) => (prev === b.id ? null : b.id))}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
                <span className="text-muted-foreground">
                  {b.driver?.name ? `Chauffeur: ${b.driver.name}` : "Chauffeur non assigné"}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold">
                  Statut: {statusLabel[b.status]}
                </span>
              </div>

              {driverLike ? (
                <div className="flex flex-wrap items-center gap-2">
                  {!isTaken ? (
                    <Button
                      size="sm"
                      onClick={() => handleClaim(b)}
                      disabled={savingId === b.id}
                      variant="default"
                    >
                      Prendre la course
                    </Button>
                  ) : assignedToMe ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRelease(b)}
                        disabled={savingId === b.id}
                      >
                        Libérer
                      </Button>
                      <Select
                        value={transferTarget[b.id] ?? ""}
                        onValueChange={(v) => setTransferTarget((prev) => ({ ...prev, [b.id]: v }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Transférer à" />
                        </SelectTrigger>
                        <SelectContent>
                          {driverOptions
                            .filter((d) => d.id !== currentUser?.id)
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTransfer(b)}
                        disabled={savingId === b.id}
                      >
                        Transférer
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Course déjà prise.</p>
                  )}
                </div>
              ) : null}

              {editingId === b.id ? (
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={b.pickup}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, pickup: e.target.value } : bk
                          )
                        )
                      }
                      placeholder="Départ"
                    />
                    <Input
                      value={b.dropoff}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, dropoff: e.target.value } : bk
                          )
                        )
                      }
                      placeholder="Arrivée"
                    />
                    <Input
                      type="number"
                      value={b.pax}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, pax: Number(e.target.value) } : bk
                          )
                        )
                      }
                      placeholder="Passagers"
                    />
                    <Input
                      type="number"
                      value={b.luggage}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, luggage: Number(e.target.value) } : bk
                          )
                        )
                      }
                      placeholder="Bagages"
                    />
                    <Input
                      type="number"
                      value={b.priceCents ?? ""}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id
                              ? {
                                  ...bk,
                                  priceCents: e.target.value ? Number(e.target.value) : null,
                                }
                              : bk
                          )
                        )
                      }
                      placeholder="Prix (centimes)"
                    />
                    <Select
                      value={b.status}
                      onValueChange={(v) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, status: v as BookingStatus } : bk
                          )
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as BookingStatus[]
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      className="sm:col-span-2"
                      value={b.notes ?? ""}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) => (bk.id === b.id ? { ...bk, notes: e.target.value } : bk))
                        )
                      }
                      placeholder="Notes"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleSave(b)} disabled={savingId === b.id}>
                      Sauvegarder
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      disabled={savingId === b.id}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
        <span>
          Page {page}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
