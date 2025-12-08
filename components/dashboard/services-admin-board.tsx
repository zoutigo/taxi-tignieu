"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppMessage } from "@/components/app-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type HighlightRow = { id: number; label: string; position?: number };
type ServiceRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  isEnabled: boolean;
  position?: number;
  highlights: HighlightRow[];
};
type CategoryRow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  position?: number;
  services: ServiceRow[];
};

type Props = {
  initialCategories: CategoryRow[];
};

const sortAll = (categories: CategoryRow[]) =>
  [...categories]
    .map((cat) => ({
      ...cat,
      services: [...(cat.services ?? [])]
        .map((svc) => ({
          ...svc,
          highlights: [...(svc.highlights ?? [])].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id
          ),
        }))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id),
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);

export function ServicesAdminBoard({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>(() => sortAll(initialCategories));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState({ slug: "", title: "", summary: "", position: 0 });
  const [newServiceForm, setNewServiceForm] = useState<
    Record<number, { title: string; description: string; position?: number; slug: string }>
  >({});
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<number | null>(null);
  const [expandedCatId, setExpandedCatId] = useState<number | null>(
    initialCategories.length ? initialCategories[0].id : null
  );

  const isLoading = (key: string) => loading === key;

  const pushMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2800);
  };
  const pushError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3200);
  };

  const api = async (path: string, method: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Action impossible");
    }
    return json;
  };

  const updateCategoryState = (id: number, patch: Partial<CategoryRow>) => {
    setCategories((prev) => sortAll(prev.map((c) => (c.id === id ? { ...c, ...patch } : c))));
  };

  const saveCategory = async (cat: CategoryRow) => {
    setLoading(`cat-${cat.id}`);
    try {
      const { category } = await api("/api/admin/service-categories", "PATCH", {
        id: cat.id,
        slug: cat.slug.trim(),
        title: cat.title.trim(),
        summary: cat.summary.trim(),
        position: cat.position ?? 0,
      });
      updateCategoryState(cat.id, category);
      pushMessage("Catégorie mise à jour");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const createCategory = async () => {
    if (!newCategory.slug.trim() || !newCategory.title.trim() || !newCategory.summary.trim()) {
      pushError("Slug, titre et résumé sont requis.");
      return;
    }
    setLoading("new-category");
    try {
      const { category } = await api("/api/admin/service-categories", "POST", {
        ...newCategory,
        position: Number(newCategory.position) || 0,
      });
      setCategories((prev) => sortAll([...prev, { ...category, services: [] }]));
      setNewCategory({ slug: "", title: "", summary: "", position: 0 });
      pushMessage("Catégorie créée");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const deleteCategory = async () => {
    if (!pendingDeleteCategory) return;
    const id = pendingDeleteCategory;
    setLoading(`del-cat-${id}`);
    try {
      await api("/api/admin/service-categories", "DELETE", { id });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      pushMessage("Catégorie supprimée");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
      setPendingDeleteCategory(null);
    }
  };

  const createService = async (categoryId: number) => {
    const form = newServiceForm[categoryId] ?? { title: "", description: "", slug: "" };
    if (!form.title.trim() || !form.description.trim() || !form.slug.trim()) {
      pushError("Slug, titre et description sont requis.");
      return;
    }
    setLoading(`new-service-${categoryId}`);
    try {
      const { service } = await api("/api/admin/services", "POST", {
        categoryId,
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        position: form.position ? Number(form.position) : 0,
      });
      setCategories((prev) =>
        sortAll(
          prev.map((c) =>
            c.id === categoryId
              ? { ...c, services: [...c.services, { ...service, highlights: [] }] }
              : c
          )
        )
      );
      setNewServiceForm((prev) => ({
        ...prev,
        [categoryId]: { title: "", description: "", position: form.position, slug: "" },
      }));
      pushMessage("Service ajouté");
    } catch (err) {
      pushError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const categoryCount = useMemo(() => categories.length, [categories]);

  return (
    <div className="space-y-5">
      {message ? <AppMessage variant="success">{message}</AppMessage> : null}
      {error ? <AppMessage variant="error">{error}</AppMessage> : null}

      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-card to-muted/50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {categoryCount} catégories |{" "}
              {categories.reduce((acc, c) => acc + c.services.length, 0)} services
            </p>
            <p className="text-sm text-muted-foreground">
              Ajoutez des paragraphes dans la description pour aérer le texte. Seuls les services
              activés sont affichés sur /services.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Nouvelle catégorie</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Slug (ex: particuliers)"
            value={newCategory.slug}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))}
          />
          <Input
            placeholder="Titre"
            value={newCategory.title}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Résumé"
            value={newCategory.summary}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, summary: e.target.value }))}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={newCategory.position}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, position: Number(e.target.value) || 0 }))
              }
              className="w-32"
              placeholder="Ordre"
            />
            <Button onClick={createCategory} disabled={isLoading("new-category")}>
              {isLoading("new-category") ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const isOpen = expandedCatId === cat.id;
          return (
            <div
              key={cat.id}
              className="rounded-[18px] border border-border/60 bg-gradient-to-br from-background via-card to-muted/50 p-4 shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 text-left"
                onClick={() => setExpandedCatId(isOpen ? null : cat.id)}
              >
                <span className="mt-1 text-muted-foreground">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{cat.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {cat.services.length} services
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{cat.summary}</p>
                </div>
              </button>

              {isOpen ? (
                <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
                  <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto] md:items-start">
                    <div className="space-y-2">
                      <Input
                        value={cat.title}
                        onChange={(e) => updateCategoryState(cat.id, { title: e.target.value })}
                        placeholder="Titre"
                      />
                      <Textarea
                        value={cat.summary}
                        onChange={(e) => updateCategoryState(cat.id, { summary: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={cat.slug}
                        onChange={(e) => updateCategoryState(cat.id, { slug: e.target.value })}
                        placeholder="Slug"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={cat.position ?? 0}
                        onChange={(e) =>
                          updateCategoryState(cat.id, { position: Number(e.target.value) || 0 })
                        }
                        placeholder="Ordre"
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:items-end">
                      <Button
                        variant="outline"
                        onClick={() => setPendingDeleteCategory(cat.id)}
                        disabled={isLoading(`del-cat-${cat.id}`) || cat.services.length > 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                      <Button
                        onClick={() => saveCategory(cat)}
                        disabled={isLoading(`cat-${cat.id}`)}
                      >
                        {isLoading(`cat-${cat.id}`) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Services de {cat.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.services.map((svc) => (
                        <Link
                          key={svc.id}
                          href={`/dashboard/services/${svc.slug}`}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border border-border/50 bg-white/70 px-3 py-1 text-sm text-foreground shadow-sm backdrop-blur transition hover:border-primary hover:text-primary dark:bg-black/20",
                            !svc.isEnabled ? "opacity-70 line-through" : ""
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {svc.title}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 p-3">
                    <p className="text-sm font-semibold text-foreground">Ajouter un service</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <Input
                        placeholder="Titre"
                        value={newServiceForm[cat.id]?.title ?? ""}
                        onChange={(e) =>
                          setNewServiceForm((prev) => ({
                            ...prev,
                            [cat.id]: {
                              ...(prev[cat.id] ?? { description: "", slug: "" }),
                              title: e.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        placeholder="Slug"
                        value={newServiceForm[cat.id]?.slug ?? ""}
                        onChange={(e) =>
                          setNewServiceForm((prev) => ({
                            ...prev,
                            [cat.id]: {
                              ...(prev[cat.id] ?? { description: "", title: "" }),
                              slug: e.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        value={newServiceForm[cat.id]?.position ?? 0}
                        onChange={(e) =>
                          setNewServiceForm((prev) => ({
                            ...prev,
                            [cat.id]: {
                              ...(prev[cat.id] ?? { title: "", description: "", slug: "" }),
                              position: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        placeholder="Ordre"
                      />
                    </div>
                    <Textarea
                      className="mt-2"
                      placeholder="Description (avec paragraphes)"
                      rows={3}
                      value={newServiceForm[cat.id]?.description ?? ""}
                      onChange={(e) =>
                        setNewServiceForm((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...(prev[cat.id] ?? { title: "", slug: "" }),
                            description: e.target.value,
                          },
                        }))
                      }
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => createService(cat.id)}
                        disabled={isLoading(`new-service-${cat.id}`)}
                      >
                        {isLoading(`new-service-${cat.id}`) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Ajouter le service
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDeleteCategory !== null}
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={deleteCategory}
        message="Supprimer la catégorie (aucun service associé requis) ?"
      />
    </div>
  );
}
