"use client";

import { useMemo, useState } from "react";
import type { Review } from "@prisma/client";
import { paginateArray, paginationDefaults } from "@/lib/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ReviewRow = Review & { user?: { name: string | null; image?: string | null } | null };

type Props = {
  reviews: ReviewRow[];
};

export function ReviewsPublicList({ reviews }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = paginationDefaults.avis;

  const { items, totalPages, currentPage } = useMemo(
    () => paginateArray(reviews, page, pageSize),
    [reviews, page, pageSize]
  );

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
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
            Aucun avis publié pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {items.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={review.user?.image ?? undefined}
                        alt={review.user?.name ?? "Client"}
                      />
                      <AvatarFallback>
                        {(review.user?.name ?? "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-foreground">{review.user?.name ?? "Client"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-foreground">{review.comment}</p>
                <div className="mt-2 flex items-center gap-2 text-amber-500">
                  {"★★★★★☆☆☆☆☆".slice(5 - review.rating, 10 - review.rating)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
        <span>
          Page {currentPage}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
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
