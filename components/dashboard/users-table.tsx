"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@prisma/client";
import { Mail, PhoneCall, Search, UserCheck, UserX } from "lucide-react";
import { AppMessage } from "@/components/app-message";
import { loadPaginationSettings, paginateArray, savePaginationSettings } from "@/lib/pagination";

type UserRow = Pick<
  User,
  "id" | "name" | "email" | "phone" | "isAdmin" | "isManager" | "isDriver" | "isActive"
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
  const [query, setQuery] = useState("");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => loadPaginationSettings().users);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [u.name ?? "", u.email ?? "", u.phone ?? ""].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  const paged = useMemo(
    () => paginateArray(filteredUsers, page, pageSize),
    [filteredUsers, page, pageSize]
  );

  useEffect(() => {
    if (page > paged.totalPages) {
      setPage(paged.totalPages);
    }
  }, [page, paged.totalPages]);

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

  const toggleActive = async (user: UserRow) => {
    setError(null);
    setLoadingUserId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Impossible de mettre à jour le statut.");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
      );
      setMessage(user.isActive ? "Utilisateur désactivé." : "Utilisateur réactivé.");
      setTimeout(() => setMessage(null), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de mettre à jour le statut.";
      setError(msg);
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="space-y-3">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4 text-primary" />
          Rechercher un utilisateur
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Nom, email ou téléphone"
          className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {!paged.items.length ? (
        <div className="rounded-xl border border-border/70 bg-card px-4 py-6 text-sm text-muted-foreground">
          Aucun utilisateur ne correspond à votre recherche.
        </div>
      ) : null}

      {paged.items.map((u) => (
        <div key={u.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 text-sm text-foreground md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{u.name ?? "—"}</p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                {u.email ? (
                  <a
                    href={`mailto:${u.email}`}
                    className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 text-primary transition hover:border-primary hover:bg-primary/10"
                    aria-label="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                ) : null}
                <span className="min-w-0 break-all">{u.email ?? "—"}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                {u.phone ? (
                  <a
                    href={`tel:${u.phone}`}
                    className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 text-primary transition hover:border-primary hover:bg-primary/10"
                    aria-label="Appeler"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </a>
                ) : null}
                <span className="min-w-0 break-all">{u.phone ?? "—"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs md:justify-end">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 font-semibold whitespace-nowrap ${
                  u.isActive
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {u.isActive ? "Actif" : "Inactif"}
              </span>
              {(["isAdmin", "isManager", "isDriver"] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 whitespace-nowrap"
                >
                  <input
                    type="checkbox"
                    checked={u[role]}
                    disabled={!u.isActive || loadingUserId === u.id}
                    onChange={(e) => toggleRole(u.id, role, e.target.checked)}
                  />
                  {role.replace("is", "")}
                </label>
              ))}
              <button
                type="button"
                className={`cursor-pointer inline-flex items-center gap-1 rounded-full px-2 py-1 whitespace-nowrap disabled:opacity-50 ${
                  u.isActive
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
                onClick={() => {
                  void toggleActive(u);
                }}
                disabled={loadingUserId === u.id}
                aria-label={`${u.isActive ? "Désactiver" : "Activer"} ${u.name ?? u.email ?? "utilisateur"}`}
              >
                {u.isActive ? (
                  <UserX className="h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                {u.isActive ? "Désactiver" : "Activer"}
              </button>
            </div>
          </div>
          {u.bookings.length ? (
            <div className="mt-3 text-xs">
              <button
                type="button"
                className="cursor-pointer text-primary font-semibold"
                onClick={() => setOpenUserId((prev) => (prev === u.id ? null : u.id))}
              >
                Réservations ({u.bookings.filter((b) => b.status === "COMPLETED").length}/
                {u.bookings.length})
              </button>
              {openUserId === u.id ? (
                <div className="mt-2 rounded-lg border border-border/60 overflow-hidden">
                  {u.bookings.map((b, idx) => {
                    const steps = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
                    const activeIndex = steps.indexOf(b.status as (typeof steps)[number]);
                    return (
                      <div
                        key={b.id}
                        className={`flex items-start gap-2 px-3 py-2 ${
                          idx % 2 === 0 ? "bg-muted/50" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
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
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium text-foreground break-words">
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

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Éléments par page</span>
          <input
            type="number"
            min={1}
            className="h-9 w-20 rounded-md border border-border bg-background px-2"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:items-center">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border/70 bg-muted px-3 py-1 text-sm disabled:opacity-50"
            disabled={paged.currentPage <= 1}
            onClick={() => setPage(Math.max(1, paged.currentPage - 1))}
          >
            Précédent
          </button>
          <span className="text-center text-muted-foreground">
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
    </div>
  );
}
