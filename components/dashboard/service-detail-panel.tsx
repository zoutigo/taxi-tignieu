"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AppMessage } from "@/components/app-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type ServiceWithRelations = {
  id: string;
  slug: string;
  title: string;
  description: string;
  isEnabled: boolean;
  position?: number;
  categoryId: string;
  category?: { id: string; title: string; slug: string };
  highlights: { id: string; label: string; position?: number }[];
};

type Category = { id: string; title: string };

type Props = {
  service: ServiceWithRelations;
  categories: Category[];
};

export function ServiceDetailPanel({ service, categories }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceWithRelations>(() => ({
    ...service,
    highlights: service.highlights ?? [],
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [pendingDeleteHighlight, setPendingDeleteHighlight] = useState<string | null>(null);

  const isLoading = (key: string) => loading === key;

  const pushMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  };

  const pushError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const api = async (path: string, method: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Action impossible");
    return json;
  };

  const saveService = async () => {
    setLoading("service");
    try {
      const { service: updated } = await api("/api/admin/services", "PATCH", {
        id: form.id,
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        position: form.position ?? 0,
        isEnabled: form.isEnabled,
      });
      setForm((prev) => ({ ...prev, ...updated }));
      pushMessage("Service enregistré");
      if (updated.slug !== service.slug) {
        router.replace(`/dashboard/services/${updated.slug}`);
      }
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const moveToCategory = async (categoryId: string) => {
    setLoading("category");
    try {
      const { service: updated } = await api("/api/admin/services", "PATCH", {
        id: form.id,
        slug: form.slug.trim(),
        categoryId,
      });
      setForm((prev) => ({ ...prev, ...updated, categoryId }));
      pushMessage("Catégorie mise à jour");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const saveHighlight = async (id: string, label: string, position?: number) => {
    setLoading(`hl-${id}`);
    try {
      const { highlight } = await api("/api/admin/service-highlights", "PATCH", {
        id,
        label: label.trim(),
        position: position ?? 0,
      });
      setForm((prev) => ({
        ...prev,
        highlights: prev.highlights.map((h) => (h.id === id ? { ...h, ...highlight } : h)),
      }));
      pushMessage("Highlight enregistré");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const addHighlight = async () => {
    const label = prompt("Texte du highlight");
    if (!label) return;
    setLoading("new-hl");
    try {
      const { highlight } = await api("/api/admin/service-highlights", "POST", {
        serviceId: form.id,
        label: label.trim(),
      });
      setForm((prev) => ({ ...prev, highlights: [...prev.highlights, highlight] }));
      pushMessage("Highlight ajouté");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const deleteHighlight = async () => {
    if (!pendingDeleteHighlight) return;
    const id = pendingDeleteHighlight;
    setLoading(`del-hl-${id}`);
    try {
      await api("/api/admin/service-highlights", "DELETE", { id });
      setForm((prev) => ({
        ...prev,
        highlights: prev.highlights.filter((h) => h.id !== id),
      }));
      pushMessage("Highlight supprimé");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
      setPendingDeleteHighlight(null);
    }
  };

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId),
    [categories, form.categoryId]
  );

  return (
    <div className="space-y-5">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titre"
            />
            <Input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug (URL admin)"
            />
            <Textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description avec paragraphes (séparer par des lignes vides)"
            />
          </div>
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Affichage</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, isEnabled: Boolean(v) }))}
                />
                <span>{form.isEnabled ? "Activé" : "Masqué"}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Catégorie
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition",
                      cat.id === form.categoryId
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/60"
                    )}
                    onClick={() => moveToCategory(cat.id)}
                    disabled={isLoading("category")}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ordre
              </label>
              <Input
                type="number"
                min={0}
                value={form.position ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    position: Number(e.target.value) || prev.position || 0,
                  }))
                }
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Appartient à :{" "}
              <span className="font-semibold text-foreground">{currentCategory?.title}</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveService} disabled={isLoading("service")}>
                {isLoading("service") ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Highlights</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={addHighlight}
            disabled={isLoading("new-hl")}
          >
            {isLoading("new-hl") ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {form.highlights.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-border/60 bg-muted/40 p-3 shadow-sm"
            >
              <Input
                value={h.label}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    highlights: prev.highlights.map((x) =>
                      x.id === h.id ? { ...x, label: e.target.value } : x
                    ),
                  }))
                }
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={h.position ?? 0}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      highlights: prev.highlights.map((x) =>
                        x.id === h.id ? { ...x, position: Number(e.target.value) || 0 } : x
                      ),
                    }))
                  }
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDeleteHighlight(h.id)}
                    disabled={isLoading(`del-hl-${h.id}`)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveHighlight(h.id, h.label, h.position)}
                    disabled={isLoading(`hl-${h.id}`)}
                  >
                    {isLoading(`hl-${h.id}`) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!form.highlights.length ? (
            <p className="text-sm text-muted-foreground">Pas encore de highlights.</p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteHighlight !== null}
        onCancel={() => setPendingDeleteHighlight(null)}
        onConfirm={deleteHighlight}
        message="Supprimer ce highlight ?"
      />
    </div>
  );
}
