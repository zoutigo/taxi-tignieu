"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  loadPaginationSettings,
  paginateArray,
  paginationDefaults,
  savePaginationSettings,
} from "@/lib/pagination";

type InvoiceRow = {
  id: string;
  client: string;
  amountEuros: number;
  issuedAt: string;
  pdfPath?: string | null;
  bookingId?: string | null;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    () => loadPaginationSettings().invoices ?? paginationDefaults.invoices
  );

  const paginated = useMemo(
    () => paginateArray(invoices, page, pageSize),
    [invoices, page, pageSize]
  );

  const handlePageSize = (value: number) => {
    const safe = Math.max(1, value || 1);
    setPageSize(safe);
    setPage(1);
    const current = loadPaginationSettings();
    savePaginationSettings({ ...current, invoices: safe });
  };

  const hasDownload = (pdfPath?: string | null) => Boolean(pdfPath && pdfPath.trim().length > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {paginated.items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Aucune facture générée.</p>
      ) : (
        <>
          <div className="space-y-4 px-4 py-4">
            {paginated.items.map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 shadow-xs"
              >
                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      ID
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{inv.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Client
                    </span>
                    <span className="text-right">{inv.client}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Montant
                    </span>
                    <span className="font-semibold text-foreground">
                      {inv.amountEuros.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </span>
                    <span className="text-right text-muted-foreground">
                      {formatDate(inv.issuedAt)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    asChild
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Télécharger la facture"
                    disabled={!hasDownload(inv.pdfPath)}
                  >
                    <a
                      href={hasDownload(inv.pdfPath) ? (inv.pdfPath ?? "#") : undefined}
                      download
                      className="cursor-pointer"
                    >
                      <Download className="size-4" />
                    </a>
                  </Button>
                  <Button asChild size="icon-sm" variant="ghost" aria-label="Éditer la facture">
                    <a href={`/dashboard/invoices/${inv.id}/edit`} className="cursor-pointer">
                      <Pencil className="size-4" />
                    </a>
                  </Button>
                  {inv.bookingId ? (
                    <Button asChild size="icon-sm" variant="ghost" aria-label="Voir la réservation">
                      <a href={`/dashboard/bookings/${inv.bookingId}`} className="cursor-pointer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Éléments par page</span>
              <input
                type="number"
                min={1}
                className="w-16 rounded-md border border-border/80 bg-card px-2 py-1 text-foreground shadow-xs"
                value={pageSize}
                onChange={(e) => handlePageSize(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                disabled={paginated.currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {paginated.currentPage} / {paginated.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                disabled={paginated.currentPage === paginated.totalPages}
                onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
