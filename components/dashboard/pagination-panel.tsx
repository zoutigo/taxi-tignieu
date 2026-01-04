"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppMessage } from "@/components/app-message";
import {
  loadPaginationSettings,
  paginationDefaults,
  savePaginationSettings,
  type PaginationSettings,
} from "@/lib/pagination";

export function PaginationPanel() {
  const [pagination, setPagination] = useState<PaginationSettings>(() => loadPaginationSettings());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    savePaginationSettings(pagination);
  }, [pagination]);

  const updatePagination = (key: keyof PaginationSettings, value: number) => {
    const next = Math.max(1, value || paginationDefaults[key]);
    setPagination((prev) => ({ ...prev, [key]: next }));
  };

  const reset = () => {
    setPagination(paginationDefaults);
    setMessage("Pagination réinitialisée.");
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <section className="space-y-4">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tailles de page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Réservations</span>
            <Input
              type="number"
              min={1}
              value={pagination.bookings}
              onChange={(e) => updatePagination("bookings", Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Avis</span>
            <Input
              type="number"
              min={1}
              value={pagination.avis}
              onChange={(e) => updatePagination("avis", Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Utilisateurs</span>
            <Input
              type="number"
              min={1}
              value={pagination.users}
              onChange={(e) => updatePagination("users", Number(e.target.value))}
            />
          </label>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={reset}>
          Réinitialiser
        </Button>
        <Button
          onClick={() => {
            savePaginationSettings(pagination);
            setMessage("Pagination mise à jour.");
            setTimeout(() => setMessage(null), 2000);
          }}
        >
          Sauvegarder
        </Button>
      </div>
    </section>
  );
}
