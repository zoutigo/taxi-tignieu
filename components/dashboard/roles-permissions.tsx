"use client";

import { useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AppMessage } from "@/components/app-message";
import { dashboardModules, roles, type PermissionFlag } from "@/lib/roles";

type Props = {
  initialPermissions: PermissionFlag[];
};

export function RolesPermissions({ initialPermissions }: Props) {
  const [permissions, setPermissions] = useState<PermissionFlag[]>(initialPermissions);
  const [selectedRoles, setSelectedRoles] = useState<PermissionFlag["role"][]>(["MANAGER"]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (
    module: string,
    role: PermissionFlag["role"],
    key: keyof Omit<PermissionFlag, "module" | "role">
  ) => {
    setPermissions((prev) =>
      prev.map((p) => (p.module === module && p.role === role ? { ...p, [key]: !p[key] } : p))
    );
  };

  const toggleRoleFilter = (role: PermissionFlag["role"]) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.length === 1 ? prev : prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const save = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Impossible d'enregistrer les permissions.");
      return;
    }
    setMessage("Permissions enregistrées.");
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="space-y-4">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Filtrer par rôle
        </span>
        {roles.map((role) => {
          const active = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggleRoleFilter(role)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {role === "MANAGER" ? "Manager" : "Driver"}
            </button>
          );
        })}
      </div>

      {roles
        .filter((role) => selectedRoles.includes(role))
        .map((role) => (
          <div key={role} className="overflow-hidden rounded-2xl border border-border/70">
            <div className="flex items-center justify-between bg-muted/60 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Rôle
                </p>
                <p className="text-sm font-semibold text-foreground">{role}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                Modules : {dashboardModules.length}
              </span>
            </div>
            <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] items-center bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Module</span>
              <span className="flex items-center justify-center" title="Voir">
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Voir</span>
              </span>
              <span className="flex items-center justify-center" title="Créer">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Créer</span>
              </span>
              <span className="flex items-center justify-center" title="Modifier">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Modifier</span>
              </span>
              <span className="flex items-center justify-center" title="Supprimer">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Supprimer</span>
              </span>
            </div>
            <div className="divide-y divide-border/70">
              {dashboardModules.map((mod, idx) => {
                const perm = permissions.find((p) => p.module === mod.id && p.role === role)!;
                const rowBg = idx % 2 === 0 ? "bg-card" : "bg-muted/30";
                return (
                  <div
                    key={`${role}-${mod.id}`}
                    className={`grid grid-cols-[1.5fr_repeat(4,1fr)] items-center px-4 py-3 text-sm ${rowBg}`}
                  >
                    <span className="font-medium text-foreground">{mod.label}</span>
                    {(["canView", "canCreate", "canUpdate", "canDelete"] as const).map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-center gap-2 text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={perm[key]}
                          onChange={() => toggle(mod.id, role, key)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary" onClick={save} disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
