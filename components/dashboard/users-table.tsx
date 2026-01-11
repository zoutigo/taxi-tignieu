"use client";

import { useMemo, useState } from "react";
import type { User } from "@prisma/client";
import { Mail, PhoneCall } from "lucide-react";
import { AppMessage } from "@/components/app-message";
import { loadPaginationSettings, paginateArray, savePaginationSettings } from "@/lib/pagination";

type UserRow = Pick<
  User,
  "id" | "name" | "email" | "phone" | "isAdmin" | "isManager" | "isDriver"
> & {
  bookings: {
    id: number;
    pickup: string;
    dropoff: string;
    status: string;
    createdAt: string;
    luggage: number;
    priceCents: number | null;
  }[];
};

type Props = {
  initialUsers: UserRow[];
};

export function UsersTable({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => loadPaginationSettings().users);

  const paged = useMemo(() => paginateArray(users, page, pageSize), [users, page, pageSize]);

  const toggleRole = async (
    id: string,
    role: "isAdmin" | "isManager" | "isDriver",
    value: boolean
  ) => {
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [role]: value }),
    });
    if (!res.ok) {
      setError("Impossible de mettre à jour l'utilisateur.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [role]: value } : u)));
    setMessage("Utilisateur mis à jour.");
    setTimeout(() => setMessage(null), 2500);
  };

  const handlePageSizeChange = (value: number) => {
    const next = Math.max(1, value || 1);
    setPageSize(next);
    setPage(1);
    const current = loadPaginationSettings();
    savePaginationSettings({ ...current, users: next });
  };

  return (
    <div className="space-y-3">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="flex items-center justify-between gap-2 text-sm">
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
            disabled={paged.currentPage <= 1}
            onClick={() => setPage(Math.max(1, paged.currentPage - 1))}
          >
            Précédent
          </button>
          <span className="text-muted-foreground">
            Page {paged.currentPage} / {paged.totalPages}
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border/70 bg-muted px-3 py-1 text-sm disabled:opacity-50"
            disabled={paged.currentPage >= paged.totalPages}
            onClick={() => setPage(Math.min(paged.totalPages, paged.currentPage + 1))}
          >
            Suivant
          </button>
        </div>
      </div>

      {paged.items.map((u) => (
        <div key={u.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
            <div className="space-y-1">
              <p className="font-semibold">{u.name ?? "—"}</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                {u.email ? (
                  <a
                    href={`mailto:${u.email}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 text-primary transition hover:border-primary hover:bg-primary/10"
                    aria-label="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                ) : null}
                <span>{u.email ?? "—"}</span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                {u.phone ? (
                  <a
                    href={`tel:${u.phone}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 text-primary transition hover:border-primary hover:bg-primary/10"
                    aria-label="Appeler"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </a>
                ) : null}
                <span>{u.phone ?? "—"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {(["isAdmin", "isManager", "isDriver"] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={u[role]}
                    onChange={(e) => toggleRole(u.id, role, e.target.checked)}
                  />
                  {role.replace("is", "")}
                </label>
              ))}
            </div>
          </div>
          {u.bookings.length ? (
            <div className="mt-3 text-xs">
              <button
                type="button"
                className="text-primary font-semibold"
                onClick={() => setOpenUserId((prev) => (prev === u.id ? null : u.id))}
              >
                Réservations ({u.bookings.filter((b) => b.status === "COMPLETED").length}/
                {u.bookings.length})
              </button>
              {openUserId === u.id ? (
                <div className="mt-2 rounded-lg border border-border/60">
                  {u.bookings.map((b, idx) => {
                    const steps = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
                    const activeIndex = steps.indexOf(b.status as (typeof steps)[number]);
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 ${
                          idx % 2 === 0 ? "bg-muted/50" : "bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col-reverse gap-0.5">
                            {steps.map((_, stepIdx) => (
                              <div
                                key={stepIdx}
                                className={`h-2 w-5 rounded-sm ${
                                  stepIdx <= activeIndex
                                    ? b.status === "CANCELLED"
                                      ? "bg-rose-500"
                                      : "bg-emerald-500"
                                    : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {b.pickup} → {b.dropoff}
                            </span>
                            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                              {new Date(b.createdAt).toLocaleDateString("fr-FR")}{" "}
                              {new Date(b.createdAt).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              Bagages: {b.luggage} • Prix:{" "}
                              {b.priceCents ? `${(b.priceCents / 100).toFixed(0)} €` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
