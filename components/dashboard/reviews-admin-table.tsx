"use client";

import { useEffect, useMemo, useState } from "react";
import type { Review, ReviewStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { loadPaginationSettings, paginateArray, savePaginationSettings } from "@/lib/pagination";
import { CheckCircle2, Clock3, Pencil, XCircle, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ReviewRow = Review & { user?: { name: string | null; email: string | null } | null };

type Props = {
  initialReviews: ReviewRow[];
};

export function ReviewsAdminTable({ initialReviews }: Props) {
  const sorted = useMemo(
    () =>
      [...initialReviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [initialReviews]
  );
  const [reviews, setReviews] = useState(sorted);
  useEffect(() => {
    setReviews(sorted);
  }, [sorted]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => loadPaginationSettings().avis);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const save = async (r: ReviewRow) => {
    setError(null);
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, rating: r.rating, comment: r.comment, status: r.status }),
    });
    if (!res.ok) {
      setError("Impossible de mettre à jour l'avis.");
      return;
    }
    setMessage("Avis mis à jour.");
    setTimeout(() => setMessage(null), 2500);
  };

  const del = async (id: number) => {
    setError(null);
    const res = await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("Impossible de supprimer l'avis.");
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setMessage("Avis supprimé.");
    setTimeout(() => setMessage(null), 2500);
  };

  const {
    items: pageReviews,
    totalPages,
    currentPage,
  } = useMemo(
    () =>
      paginateArray(
        reviews.filter((r) => (statusFilter === "ALL" ? true : r.status === statusFilter)),
        page,
        pageSize
      ),
    [reviews, page, pageSize, statusFilter]
  );

  const handlePageSize = (val: number) => {
    const nextSize = Math.max(1, val || 1);
    setPageSize(nextSize);
    const next = loadPaginationSettings();
    savePaginationSettings({ ...next, avis: nextSize });
    setPage(1);
  };

  const statusIcon = (status: ReviewStatus) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold";
    switch (status) {
      case "APPROVED":
        return (
          <span className={`${base} bg-emerald-100 text-emerald-800`}>
            <CheckCircle2 className="h-4 w-4" /> Approuvé
          </span>
        );
      case "REJECTED":
        return (
          <span className={`${base} bg-rose-100 text-rose-800`}>
            <XCircle className="h-4 w-4" /> Rejeté
          </span>
        );
      default:
        return (
          <span className={`${base} bg-amber-100 text-amber-800`}>
            <Clock3 className="h-4 w-4" /> En attente
          </span>
        );
    }
  };

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.status === "APPROVED").length;
    const pending = reviews.filter((r) => r.status === "PENDING").length;
    const average = total ? reviews.reduce((acc, r) => acc + r.rating, 0) / total : 0;
    return { total, approved, pending, average };
  }, [reviews]);

  const formatDate = (value: Date | string) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "Date inconnue";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

      <div className="rounded-xl border border-border/70 bg-card p-3 text-sm text-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">
            Moyenne : {stats.average.toFixed(1)} / 5 {"★".repeat(Math.round(stats.average)) || "—"}
          </span>
          <span className="text-muted-foreground">Total : {stats.total}</span>
          <span className="text-amber-700">En attente : {stats.pending}</span>
          <span className="text-emerald-700">Approuvés : {stats.approved}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
          const icon =
            s === "ALL" ? (
              <Sparkles className="h-4 w-4" />
            ) : s === "PENDING" ? (
              <Clock3 className="h-4 w-4" />
            ) : s === "APPROVED" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            );
          const label =
            s === "ALL"
              ? "Tous"
              : s === "PENDING"
                ? "En attente"
                : s === "APPROVED"
                  ? "Approuvés"
                  : "Rejetés";
          return (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(s as ReviewStatus | "ALL");
                setPage(1);
              }}
              className="flex items-center gap-1"
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        })}
      </div>

      {pageReviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold">{r.user?.name ?? "Client"}</p>
                <p className="text-muted-foreground text-xs">{formatDate(r.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                  {r.rating}/5
                </span>
              </div>
            </div>

            <p className="text-foreground">{r.comment}</p>

            {editingId === r.id ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                <Select
                  value={String(r.rating)}
                  onValueChange={(v) =>
                    setReviews((prev) =>
                      prev.map((rv) => (rv.id === r.id ? { ...rv, rating: Number(v) } : rv))
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Note" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} étoiles
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={r.comment}
                  onChange={(e) =>
                    setReviews((prev) =>
                      prev.map((rv) => (rv.id === r.id ? { ...rv, comment: e.target.value } : rv))
                    )
                  }
                />
                <Select
                  value={r.status}
                  onValueChange={(v) =>
                    setReviews((prev) =>
                      prev.map((rv) => (rv.id === r.id ? { ...rv, status: v as ReviewStatus } : rv))
                    )
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(r)}>
                    Sauvegarder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">{statusIcon(r.status)}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-sidebar text-sidebar-foreground hover:bg-sidebar/80"
                  onClick={() => setEditingId((prev) => (prev === r.id ? null : r.id))}
                  aria-label="Modifier l'avis"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full bg-sidebar text-sidebar-foreground hover:bg-sidebar/70"
                  onClick={() => setPendingDelete(r.id)}
                  aria-label="Supprimer l'avis"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cet avis ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete !== null) {
            await del(pendingDelete);
          }
          setPendingDelete(null);
        }}
      />

      <div className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {currentPage}/{totalPages}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span>Éléments par page</span>
          <Input
            type="number"
            min={1}
            className="h-9 w-20"
            value={pageSize}
            onChange={(e) => handlePageSize(Number(e.target.value))}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
