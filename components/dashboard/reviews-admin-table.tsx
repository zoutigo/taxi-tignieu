"use client";

import { useState } from "react";
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

type ReviewRow = Review & { user?: { name: string | null; email: string | null } | null };

type Props = {
  initialReviews: ReviewRow[];
};

export function ReviewsAdminTable({ initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      {message ? (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <p className="font-semibold">{r.user?.name ?? "Client"}</p>
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
              <Button size="sm" variant="ghost" onClick={() => del(r.id)}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
