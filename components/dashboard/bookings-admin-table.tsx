"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Booking, BookingNote, BookingStatus, User, Invoice } from "@prisma/client";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  Mail,
  PhoneCall,
  Pencil,
  XCircle,
  Info,
  Check,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadPaginationSettings,
  paginateArray,
  savePaginationSettings,
  paginationDefaults,
} from "@/lib/pagination";
import { AppMessage } from "@/components/app-message";
import { cn } from "@/lib/utils";
import type { AddressData } from "@/lib/booking-utils";
import { inferTariffFromDateTime, haversineKm } from "@/lib/booking-utils";
import { computePriceEuros } from "@/lib/tarifs";

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
  invoice?: Invoice | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
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

const statusPillTone = (status: BookingStatus) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-800";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-muted text-foreground";
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
  const [globalFeedback, setGlobalFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(paginationDefaults.bookings);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmDriver, setConfirmDriver] = useState<Record<string, string>>({});
  const [confirmNote, setConfirmNote] = useState<Record<string, string>>({});
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishNote, setFinishNote] = useState<Record<string, string>>({});
  const [finishInvoice, setFinishInvoice] = useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [inlineFeedback, setInlineFeedback] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState<Record<string, string>>({});
  const [suppressToken, setSuppressToken] = useState<Record<string, number>>({});

  const recomputeQuote = async (bk: BookingRow) => {
    const pickupLat =
      bk.pickupLat ??
      (bk as unknown as { pickup?: { latitude?: number | null } }).pickup?.latitude ??
      undefined;
    const pickupLng =
      bk.pickupLng ??
      (bk as unknown as { pickup?: { longitude?: number | null } }).pickup?.longitude ??
      undefined;
    const dropoffLat =
      bk.dropoffLat ??
      (bk as unknown as { dropoff?: { latitude?: number | null } }).dropoff?.latitude ??
      undefined;
    const dropoffLng =
      bk.dropoffLng ??
      (bk as unknown as { dropoff?: { longitude?: number | null } }).dropoff?.longitude ??
      undefined;

    if (
      pickupLat == null ||
      pickupLng == null ||
      dropoffLat == null ||
      dropoffLng == null ||
      !Number.isFinite(pickupLat) ||
      !Number.isFinite(pickupLng) ||
      !Number.isFinite(dropoffLat) ||
      !Number.isFinite(dropoffLng)
    ) {
      return;
    }
    const d = new Date(bk.dateTime as unknown as string);
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toISOString().slice(11, 16);
    const tariff = inferTariffFromDateTime(dateStr, timeStr);
    try {
      const res = await fetch("/api/tarifs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: pickupLat, lng: pickupLng },
          to: { lat: dropoffLat, lng: dropoffLng },
          tariff,
          baggageCount: bk.luggage ?? 0,
          fifthPassenger: (bk.pax ?? 0) > 4,
          waitMinutes: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Calcul du tarif impossible");
      }
      const distanceApi = Number(data.distanceKm);
      const priceApi = Number(data.price);
      const distance = Number.isFinite(distanceApi)
        ? distanceApi
        : haversineKm({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng });
      const price = Number.isFinite(priceApi)
        ? priceApi
        : computePriceEuros(distance, tariff, {
            baggageCount: bk.luggage ?? 0,
            fifthPassenger: (bk.pax ?? 0) > 4,
            waitMinutes: 0,
          });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bk.id
            ? {
                ...b,
                distanceKm: Number.isFinite(distance) ? Number(distance.toFixed(2)) : b.distanceKm,
                priceCents: Number.isFinite(price) ? Math.round(price * 100) : b.priceCents,
              }
            : b
        )
      );
    } catch {
      // silencieux pour ne pas bloquer l'édition
    }
  };

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
    const saved = loadPaginationSettings();
    setPageSize(saved.bookings);
    setPage(1);
  }, []);
  useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const FEEDBACK_DURATION = 10000;

  useEffect(() => {
    if (!inlineFeedback) return;
    const timers = Object.keys(inlineFeedback).map((id) =>
      setTimeout(() => {
        setInlineFeedback((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, FEEDBACK_DURATION)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [inlineFeedback]);

  useEffect(() => {
    if (!globalFeedback) return;
    const timer = setTimeout(() => setGlobalFeedback(null), FEEDBACK_DURATION);
    return () => clearTimeout(timer);
  }, [globalFeedback]);

  const scrollToTop = () => {
    if (
      typeof window === "undefined" ||
      typeof window.scrollTo !== "function" ||
      (typeof navigator !== "undefined" && navigator.userAgent?.includes?.("jsdom"))
    )
      return;
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
      // renforce le scroll après le render
      setTimeout(() => {
        if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
    } catch {
      // jsdom does not implement scrollTo; ignore in tests.
    }
  };

  const formatClientLabel = (b: BookingRow) =>
    b.user?.name ?? b.customer?.fullName ?? b.user?.email ?? "Client";

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
        pax: b.pax,
        luggage: b.luggage,
        status: b.status,
        priceCents: b.priceCents ?? undefined,
        distanceKm: b.distanceKm ?? undefined,
        notes: b.notes ?? "",
        dateTime: b.dateTime,
      });
      updateLocal(updated as BookingRow);
      setGlobalFeedback({
        type: "success",
        text: `Réservation ${b.id} mise à jour pour ${formatClientLabel((updated as BookingRow) ?? b)}.`,
      });
      setMessage(null);
      scrollToTop();
      setEditingId(null);
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
      setGlobalFeedback({ type: "success", text: "Course prise" });
    } catch (e) {
      setGlobalFeedback({
        type: "error",
        text: e instanceof Error ? e.message : "Impossible de prendre la course.",
      });
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
      setGlobalFeedback({ type: "success", text: `Statut mis à jour (${statusLabel[target]})` });
    } catch (e) {
      setGlobalFeedback({
        type: "error",
        text: e instanceof Error ? e.message : "Impossible de mettre à jour le statut.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmWithDriver = async (b: BookingRow) => {
    const driverId = confirmDriver[b.id];
    const note = confirmNote[b.id]?.trim() ?? "";
    if (!driverId || !note || b.invoice || b.status === "COMPLETED") {
      setError(
        "Choisissez un chauffeur, ajoutez une note et vérifiez que la course est modifiable."
      );
      return;
    }
    setSavingId(b.id);
    try {
      const updated = await patchBooking({ id: b.id, status: "CONFIRMED", driverId, notes: note });
      updateLocal(updated as BookingRow);
      setInlineFeedback((prev) => ({
        ...prev,
        [b.id]: { type: "success", text: "Réservation confirmée et assignée." },
      }));
      setGlobalFeedback({
        type: "success",
        text: `Réservation ${b.id} confirmée pour ${formatClientLabel((updated as BookingRow) ?? b)}.`,
      });
      scrollToTop();
      setMessage("Réservation confirmée et assignée.");
      setConfirmingId(null);
      setConfirmDriver((prev) => ({ ...prev, [b.id]: "" }));
      setConfirmNote((prev) => ({ ...prev, [b.id]: "" }));
    } catch (e) {
      const text = e instanceof Error ? e.message : "Impossible de confirmer la réservation.";
      setError(text);
      setInlineFeedback((prev) => ({ ...prev, [b.id]: { type: "error", text } }));
    } finally {
      setSavingId(null);
    }
  };

  const handleComplete = async (b: BookingRow) => {
    if (b.invoice || b.status === "COMPLETED") {
      setError("Impossible de terminer une réservation terminée ou facturée.");
      return;
    }
    const note = finishNote[b.id]?.trim() || "";
    if (!note) {
      setError("Merci d'ajouter une note de clôture.");
      return;
    }
    const generateInvoice = Boolean(finishInvoice[b.id]);
    setSavingId(b.id);
    try {
      const updated = await patchBooking({
        id: b.id,
        status: "COMPLETED",
        generateInvoice,
        completionNotes: note,
      } as Partial<BookingRow> & { id: string } & { completionNotes?: string });
      if (note) {
        updated.notes = note;
      }
      updateLocal(updated as BookingRow);
      setGlobalFeedback({
        type: "success",
        text: `Réservation ${b.id} terminée pour ${formatClientLabel((updated as BookingRow) ?? b)}.`,
      });
      scrollToTop();
      setFinishingId(null);
      setFinishNote((prev) => ({ ...prev, [b.id]: "" }));
      setFinishInvoice((prev) => ({ ...prev, [b.id]: false }));
      if (generateInvoice && typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = `/dashboard/invoices/new?bookingId=${b.id}&from=complete`;
        }, 350);
      }
    } catch (e) {
      setGlobalFeedback({
        type: "error",
        text: e instanceof Error ? e.message : "Impossible de terminer la réservation.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = async (b: BookingRow) => {
    if (b.status === "COMPLETED" || b.invoice) {
      setError("Impossible d'annuler une réservation terminée ou facturée.");
      return;
    }
    const note = cancelNote[b.id]?.trim() ?? "";
    if (!note) {
      setError("Merci d'ajouter un motif d'annulation.");
      return;
    }
    setSavingId(b.id);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, note }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Impossible d'annuler la réservation.");
      }
      const payload = (await res.json().catch(() => ({}))) as { booking?: BookingRow };
      const updated = payload.booking ?? { ...b, status: "CANCELLED" };
      updateLocal(updated as BookingRow);
      setInlineFeedback((prev) => ({
        ...prev,
        [b.id]: { type: "success", text: "Réservation annulée." },
      }));
      setGlobalFeedback({
        type: "success",
        text: `Réservation ${b.id} annulée pour ${formatClientLabel((updated as BookingRow) ?? b)}.`,
      });
      scrollToTop();
      setCancelingId(null);
      setCancelNote((prev) => ({ ...prev, [b.id]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'annuler la réservation.");
      setInlineFeedback((prev) => ({
        ...prev,
        [b.id]: {
          type: "error",
          text: e instanceof Error ? e.message : "Impossible d'annuler la réservation.",
        },
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {globalFeedback ? (
        <AppMessage variant={globalFeedback.type === "success" ? "success" : "error"}>
          {globalFeedback.text}
        </AppMessage>
      ) : null}
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
        const detailsOpenState = detailsOpen[b.id] ?? false;

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
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground">
                    <span className="font-semibold text-muted-foreground">Départ :</span>{" "}
                    <span className="font-medium">{pickupText}</span>
                  </p>
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
                  <p className="text-foreground">
                    <span className="font-semibold text-muted-foreground">Arrivée :</span>{" "}
                    <span className="font-medium">{dropoffText}</span>
                  </p>
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

              <p className="text-sm font-medium text-foreground">
                <span className="font-semibold text-muted-foreground">Client :</span>{" "}
                <span className="font-medium text-foreground">{clientName}</span>
              </p>
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
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                    statusPillTone(b.status)
                  )}
                >
                  {statusLabel[b.status]}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {b.status === "COMPLETED" && !b.invoice ? (
                    <Link
                      href={`/dashboard/invoices/new?bookingId=${b.id}`}
                      className="cursor-pointer"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer flex items-center gap-2"
                        title="Facturer"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden md:inline">Facturer</span>
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer flex items-center gap-2 text-foreground"
                    title="Détails"
                    onClick={() =>
                      setDetailsOpen((prev) => ({ ...prev, [b.id]: !detailsOpenState }))
                    }
                  >
                    <Info className="h-4 w-4" />
                    <span className="hidden md:inline">Détails</span>
                  </Button>
                  {adminLike &&
                  !b.invoice &&
                  b.status !== "COMPLETED" &&
                  b.status !== "CANCELLED" ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="cursor-pointer flex items-center gap-2 rounded-full bg-sidebar px-3 py-2 text-sidebar-foreground hover:bg-sidebar/80"
                      title="Modifier"
                      onClick={() => {
                        setEditingId((prev) => (prev === b.id ? null : b.id));
                        setSuppressToken((prev) => ({ ...prev, [b.id]: Date.now() }));
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden md:inline">Modifier</span>
                    </Button>
                  ) : null}
                  {adminLike && nextStatus(b.status) && !b.invoice && b.status !== "COMPLETED" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="cursor-pointer flex items-center gap-2"
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
                      disabled={
                        savingId === b.id ||
                        !!b.invoice ||
                        (b.status as BookingStatus) === "COMPLETED"
                      }
                      aria-label={b.status === "PENDING" ? "Confirmer" : "Terminer"}
                      title={b.status === "PENDING" ? "Confirmer" : "Terminer"}
                    >
                      <Check className="h-4 w-4" />
                      <span className="hidden md:inline">
                        {b.status === "PENDING" ? "Confirmer" : "Terminer"}
                      </span>
                    </Button>
                  ) : null}
                  {adminLike &&
                  b.status !== "COMPLETED" &&
                  b.status !== "CANCELLED" &&
                  !b.invoice ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCancelingId((prev) => (prev === b.id ? null : b.id));
                        setInlineFeedback((prev) => {
                          const next = { ...prev };
                          delete next[b.id];
                          return next;
                        });
                      }}
                      disabled={savingId === b.id}
                      className="text-destructive hover:text-destructive cursor-pointer flex items-center gap-2"
                      aria-label="Annuler la réservation"
                      title="Annuler"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden md:inline">Annuler</span>
                    </Button>
                  ) : null}
                </div>

                {inlineFeedback[b.id] ? (
                  <div
                    className={cn(
                      "mt-2 rounded-lg px-3 py-2 text-sm",
                      inlineFeedback[b.id].type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-destructive/40 bg-destructive/10 text-destructive"
                    )}
                  >
                    {inlineFeedback[b.id].text}
                  </div>
                ) : null}

                {adminLike && cancelingId === b.id ? (
                  <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm w-full">
                    <p className="text-destructive font-semibold">Confirmer l&apos;annulation</p>
                    <p className="text-muted-foreground">
                      Ajoutez un motif (obligatoire) avant d&apos;annuler cette réservation.
                    </p>
                    <Textarea
                      value={cancelNote[b.id] ?? ""}
                      onChange={(e) =>
                        setCancelNote((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                      placeholder="Motif d'annulation..."
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancel(b)}
                        disabled={savingId === b.id || !cancelNote[b.id]?.trim()}
                      >
                        Annuler la réservation
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCancelingId(null);
                          setCancelNote((prev) => ({ ...prev, [b.id]: "" }));
                        }}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {detailsOpenState ? (
                <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
                  <p className="font-semibold text-foreground">Détails</p>
                  <p className="text-muted-foreground">Réservation : {b.id}</p>
                  <p className="text-muted-foreground">
                    Chauffeur :{" "}
                    {b.driver?.name
                      ? `${b.driver.name}${b.driver.phone ? ` (${b.driver.phone})` : ""}`
                      : "Non assigné"}
                  </p>
                  {b.bookingNotes && b.bookingNotes.length ? (
                    <div className="mt-2 space-y-1">
                      {b.bookingNotes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-md border border-border/60 bg-background p-2"
                        >
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString("fr-FR")}
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
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3 space-y-3">
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
                    <Textarea
                      placeholder="Note de confirmation..."
                      value={confirmNote[b.id] ?? ""}
                      onChange={(e) =>
                        setConfirmNote((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => handleConfirmWithDriver(b)}
                      disabled={
                        savingId === b.id || !confirmDriver[b.id] || !confirmNote[b.id]?.trim()
                      }
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
                      disabled={savingId === b.id || !finishNote[b.id]?.trim()}
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
                    <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                      Départ
                      <AddressAutocomplete
                        value={b.pickupLabel ?? ""}
                        placeholder="Adresse de départ"
                        suppressToken={suppressToken[b.id]}
                        suppressInitial
                        onChange={(val) =>
                          setBookings((prev) =>
                            prev.map((bk) => (bk.id === b.id ? { ...bk, pickupLabel: val } : bk))
                          )
                        }
                        onSelect={(addr: AddressData) =>
                          setBookings((prev) => {
                            const next = prev.map((bk) =>
                              bk.id === b.id
                                ? {
                                    ...bk,
                                    pickupLabel: addr.label,
                                    pickupLat: addr.lat,
                                    pickupLng: addr.lng,
                                  }
                                : bk
                            );
                            const updated = next.find((bk) => bk.id === b.id);
                            if (updated) {
                              void recomputeQuote(updated);
                            }
                            return next;
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                      Arrivée
                      <AddressAutocomplete
                        value={b.dropoffLabel ?? ""}
                        placeholder="Adresse d'arrivée"
                        suppressToken={suppressToken[b.id]}
                        suppressInitial
                        onChange={(val) =>
                          setBookings((prev) =>
                            prev.map((bk) => (bk.id === b.id ? { ...bk, dropoffLabel: val } : bk))
                          )
                        }
                        onSelect={(addr: AddressData) =>
                          setBookings((prev) => {
                            const next = prev.map((bk) =>
                              bk.id === b.id
                                ? {
                                    ...bk,
                                    dropoffLabel: addr.label,
                                    dropoffLat: addr.lat,
                                    dropoffLng: addr.lng,
                                  }
                                : bk
                            );
                            const updated = next.find((bk) => bk.id === b.id);
                            if (updated) {
                              void recomputeQuote(updated);
                            }
                            return next;
                          })
                        }
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Date
                        <Input
                          type="date"
                          value={(() => {
                            const d = new Date(b.dateTime as unknown as string);
                            return d.toISOString().slice(0, 10);
                          })()}
                          onChange={(e) =>
                            setBookings((prev) => {
                              const next = prev.map((bk) =>
                                bk.id === b.id
                                  ? {
                                      ...bk,
                                      dateTime: new Date(
                                        `${e.target.value}T${new Date(
                                          bk.dateTime as unknown as string
                                        )
                                          .toISOString()
                                          .slice(11, 16)}`
                                      ),
                                    }
                                  : bk
                              );
                              const updated = next.find((bk) => bk.id === b.id);
                              if (updated) void recomputeQuote(updated);
                              return next;
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Heure
                        <Input
                          type="time"
                          value={(() => {
                            const d = new Date(b.dateTime as unknown as string);
                            return d.toISOString().slice(11, 16);
                          })()}
                          onChange={(e) =>
                            setBookings((prev) => {
                              const next = prev.map((bk) =>
                                bk.id === b.id
                                  ? {
                                      ...bk,
                                      dateTime: new Date(
                                        `${new Date(bk.dateTime as unknown as string)
                                          .toISOString()
                                          .slice(0, 10)}T${e.target.value}`
                                      ),
                                    }
                                  : bk
                              );
                              const updated = next.find((bk) => bk.id === b.id);
                              if (updated) void recomputeQuote(updated);
                              return next;
                            })
                          }
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Passagers
                        <Input
                          type="number"
                          value={b.pax}
                          onChange={(e) =>
                            setBookings((prev) => {
                              const next = prev.map((bk) =>
                                bk.id === b.id ? { ...bk, pax: Number(e.target.value) } : bk
                              );
                              const updated = next.find((bk) => bk.id === b.id);
                              if (updated) void recomputeQuote(updated);
                              return next;
                            })
                          }
                          placeholder="Passagers"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Bagages
                        <Input
                          type="number"
                          value={b.luggage}
                          onChange={(e) =>
                            setBookings((prev) => {
                              const next = prev.map((bk) =>
                                bk.id === b.id ? { ...bk, luggage: Number(e.target.value) } : bk
                              );
                              const updated = next.find((bk) => bk.id === b.id);
                              if (updated) void recomputeQuote(updated);
                              return next;
                            })
                          }
                          placeholder="Bagages"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Kilométrage (km)
                        <Input value={b.distanceKm ?? ""} disabled />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                        Prix (€)
                        <Input
                          value={b.priceCents != null ? (b.priceCents / 100).toFixed(2) : ""}
                          disabled
                        />
                      </label>
                    </div>
                    <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-foreground">
                      Note (obligatoire pour valider)
                      <Textarea
                        value={b.notes ?? ""}
                        onChange={(e) =>
                          setBookings((prev) =>
                            prev.map((bk) =>
                              bk.id === b.id ? { ...bk, notes: e.target.value } : bk
                            )
                          )
                        }
                        placeholder="Raisons de la modification"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(b)}
                      disabled={savingId === b.id || !(b.notes ?? "").trim()}
                    >
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
