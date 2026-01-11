"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, BookingNote, BookingStatus, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExternalLink, Mail, PhoneCall, Pencil, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadPaginationSettings, paginateArray, savePaginationSettings } from "@/lib/pagination";
import { AppMessage } from "@/components/app-message";
import { cn } from "@/lib/utils";

type Driver = Pick<User, "id" | "name" | "email" | "phone">;

type BookingRow = Booking & {
  user?: { name: string | null; email: string | null; phone: string | null } | null;
  customer?: { fullName: string; phone: string; email: string | null } | null;
  driver?: Driver | null;
  driverId?: string | null;
  pickupLabel?: string;
  dropoffLabel?: string;
  distanceKm?: number | null;
  bookingNotes?: BookingNote[];
  notes?: string | null;
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

const cardTone = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":
      return "border-primary/60 bg-amber-50/60";
    case "CONFIRMED":
      return "border-emerald-300 bg-emerald-50/60";
    case "COMPLETED":
      return "border-blue-200 bg-blue-50/60";
    case "CANCELLED":
      return "border-rose-300 bg-rose-50/60";
    default:
      return "border-border/70 bg-card";
  }
};

const nextStatus = (status: BookingStatus): BookingStatus | null => {
  if (status === "PENDING") return "CONFIRMED";
  if (status === "CONFIRMED") return "COMPLETED";
  return null;
};

const mapsUrl = (addr?: string | null) =>
  addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null;

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => loadPaginationSettings().bookings);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmDriver, setConfirmDriver] = useState<Record<string, string>>({});
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishNote, setFinishNote] = useState<Record<string, string>>({});
  const [finishInvoice, setFinishInvoice] = useState<Record<string, boolean>>({});

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

  const patchBooking = async (payload: Partial<BookingRow> & { id: string }) => {
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

  const handleAdvanceStatus = async (b: BookingRow) => {
    const target = nextStatus(b.status);
    if (!target) return;
    setSavingId(b.id);
    try {
      const updated = await patchBooking({ id: b.id, status: target });
      updateLocal(updated as BookingRow);
      setMessage(`Statut mis à jour (${statusLabel[target]})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour le statut.");
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmWithDriver = async (b: BookingRow) => {
    const driverId = confirmDriver[b.id];
    if (!driverId) {
      setError("Choisissez un chauffeur avant de confirmer.");
      return;
    }
    setSavingId(b.id);
    try {
      const updated = await patchBooking({ id: b.id, status: "CONFIRMED", driverId });
      updateLocal(updated as BookingRow);
      setMessage("Réservation confirmée et assignée.");
      setConfirmingId(null);
      setConfirmDriver((prev) => ({ ...prev, [b.id]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de confirmer la réservation.");
    } finally {
      setSavingId(null);
    }
  };

  const handleComplete = async (b: BookingRow) => {
    const note = finishNote[b.id]?.trim() || "";
    const generateInvoice = Boolean(finishInvoice[b.id]);
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        status: "COMPLETED",
        generateInvoice,
      } as Partial<BookingRow> & { id: string } & { completionNotes?: string });
      if (note) {
        updated.notes = note;
      }
      updateLocal(updated as BookingRow);
      setMessage("Réservation terminée.");
      setFinishingId(null);
      setFinishNote((prev) => ({ ...prev, [b.id]: "" }));
      setFinishInvoice((prev) => ({ ...prev, [b.id]: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de terminer la réservation.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = async (b: BookingRow) => {
    setSavingId(b.id);
    try {
      const updated = await patchBooking({ id: b.id, status: "CANCELLED" });
      updateLocal(updated as BookingRow);
      setMessage("Réservation annulée.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'annuler la réservation.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

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
        const pickupText = b.pickupLabel ?? "";
        const dropoffText = b.dropoffLabel ?? "";
        const noteText =
          b.notes ??
          (b.bookingNotes && b.bookingNotes.length
            ? b.bookingNotes[b.bookingNotes.length - 1]?.content
            : "");

        return (
          <div
            key={b.id}
            className={cn("rounded-2xl border p-4 shadow-sm sm:p-5", cardTone(b.status))}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {formatDateTime(dateValue)}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{priceLabel}</p>
                  {b.status === "COMPLETED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setSavingId(b.id);
                        setMessage(null);
                        setError(null);
                        const res = await fetch("/api/admin/bills", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ bookingId: b.id }),
                        });
                        if (res.ok) {
                          setMessage("Facture générée.");
                        } else {
                          const payload = await res.json().catch(() => ({}));
                          setError(payload?.error ?? "Impossible de générer la facture.");
                        }
                        setSavingId(null);
                      }}
                      disabled={savingId === b.id}
                    >
                      Facturer
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">Départ : {pickupText}</p>
                  {mapsUrl(pickupText) ? (
                    <a
                      href={mapsUrl(pickupText) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary transition hover:bg-primary/10 cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="hidden sm:inline">Ouvrir dans Maps</span>
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">Arrivée : {dropoffText}</p>
                  {mapsUrl(dropoffText) ? (
                    <a
                      href={mapsUrl(dropoffText) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary transition hover:bg-primary/10 cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="hidden sm:inline">Ouvrir dans Maps</span>
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {b.pax} passager{b.pax > 1 ? "s" : ""} · {b.luggage} bagage
                {b.luggage > 1 ? "s" : ""}
                {b.distanceKm != null ? <> · {b.distanceKm.toFixed(1)} km</> : null}
              </div>

              {noteText ? (
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Notes :</span> {noteText}
                </p>
              ) : null}

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
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {adminLike && nextStatus(b.status) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (b.status === "PENDING") {
                          setConfirmingId((prev) => (prev === b.id ? null : b.id));
                          setConfirmDriver((prev) => ({
                            ...prev,
                            [b.id]: prev[b.id] ?? b.driver?.id ?? "",
                          }));
                        } else if (b.status === "CONFIRMED") {
                          setFinishingId((prev) => (prev === b.id ? null : b.id));
                          setFinishNote((prev) => ({ ...prev, [b.id]: prev[b.id] ?? "" }));
                        } else {
                          handleAdvanceStatus(b);
                        }
                      }}
                      disabled={savingId === b.id}
                      className="cursor-pointer"
                    >
                      {b.status === "PENDING" ? "Confirmer" : "Terminer"}
                    </Button>
                  ) : null}
                  {adminLike ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(b)}
                      disabled={savingId === b.id}
                      className="text-destructive hover:text-destructive cursor-pointer"
                      aria-label="Annuler la réservation"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold">
                    Statut: {statusLabel[b.status]}
                  </span>
                </div>
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

              {adminLike && confirmingId === b.id && b.status === "PENDING" ? (
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={confirmDriver[b.id] ?? ""}
                      onValueChange={(v) => setConfirmDriver((prev) => ({ ...prev, [b.id]: v }))}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Sélectionner un chauffeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {driverOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmWithDriver(b)}
                      disabled={savingId === b.id || !confirmDriver[b.id]}
                      className="cursor-pointer"
                    >
                      Valider l&apos;assignation
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingId(null)}
                      disabled={savingId === b.id}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}

              {adminLike && finishingId === b.id && b.status === "CONFIRMED" ? (
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Terminer la course</p>
                  <Textarea
                    value={finishNote[b.id] ?? ""}
                    onChange={(e) =>
                      setFinishNote((prev) => ({
                        ...prev,
                        [b.id]: e.target.value,
                      }))
                    }
                    placeholder="Commentaires (attente, incidents, etc.)"
                  />
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={finishInvoice[b.id] ?? false}
                      onChange={(e) =>
                        setFinishInvoice((prev) => ({ ...prev, [b.id]: e.target.checked }))
                      }
                    />
                    Générer une facture maintenant
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleComplete(b)}
                      disabled={savingId === b.id}
                      className="cursor-pointer"
                    >
                      Valider la fin de course
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFinishingId(null)}
                      disabled={savingId === b.id}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}

              {editingId === b.id ? (
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={b.pickupLabel ?? ""}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, pickupLabel: e.target.value } : bk
                          )
                        )
                      }
                      placeholder="Départ"
                    />
                    <Input
                      value={b.dropoffLabel ?? ""}
                      onChange={(e) =>
                        setBookings((prev) =>
                          prev.map((bk) =>
                            bk.id === b.id ? { ...bk, dropoffLabel: e.target.value } : bk
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
                    {b.status === "COMPLETED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingInvoiceId(b.id)}
                        disabled={savingId === b.id}
                      >
                        Facturer
                      </Button>
                    ) : null}
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
                      placeholder="Ajouter une note (sera enregistrée)"
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

      <ConfirmDialog
        open={pendingInvoiceId !== null}
        title="Générer la facture ?"
        message="Une facture PDF sera créée pour cette réservation terminée."
        confirmLabel="Générer"
        onConfirm={async () => {
          if (pendingInvoiceId == null) return;
          const id = pendingInvoiceId;
          setPendingInvoiceId(null);
          setSavingId(id);
          setMessage(null);
          setError(null);
          const res = await fetch("/api/admin/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: id }),
          });
          if (res.ok) {
            setMessage("Facture générée.");
          } else {
            const payload = await res.json().catch(() => ({}));
            setError(payload?.error ?? "Impossible de générer la facture.");
          }
          setSavingId(null);
        }}
        onCancel={() => setPendingInvoiceId(null)}
      />
    </div>
  );
}
