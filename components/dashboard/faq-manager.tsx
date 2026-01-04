"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import { upsertFaq, deleteFaq } from "@/actions/faq";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { paginateArray } from "@/lib/pagination";
import { AppMessage } from "@/components/app-message";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };
type Faq = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  isFeatured?: boolean;
  isValidated?: boolean;
  category?: Category | null;
};

type Props = {
  faqs: Faq[];
  categories: Category[];
};

export function FaqManager({ faqs, categories }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isValidated, setIsValidated] = useState(true);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showList, setShowList] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(!!e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const filteredFaqs = useMemo(
    () =>
      categoryFilter === "ALL"
        ? faqs
        : faqs.filter((f) => (categoryFilter ? f.category?.id === categoryFilter : true)),
    [faqs, categoryFilter]
  );

  const {
    items: pagedFaqs,
    totalPages,
    currentPage,
  } = useMemo(() => paginateArray(filteredFaqs, page, pageSize), [filteredFaqs, page]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [currentPage]);

  const resetForm = () => {
    setSelectedId(null);
    setQuestion("");
    setAnswer("");
    setCategoryId(undefined);
    setIsFeatured(false);
    setIsValidated(true);
    setShowList(true);
  };

  const populateFromFaq = (faq: Faq) => {
    setSelectedId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategoryId(faq.category?.id ?? undefined);
    setIsFeatured(Boolean(faq.isFeatured));
    setIsValidated(faq.isValidated !== false);
    if (isMobile) setShowList(false);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    if (selectedId) formData.append("id", selectedId);
    formData.append("question", question);
    formData.append("answer", answer);
    if (categoryId) formData.append("categoryId", categoryId);
    formData.append("isFeatured", String(isFeatured));
    formData.append("isValidated", String(isValidated));

    startTransition(async () => {
      const res = await upsertFaq(formData);
      if ((res as { error?: string })?.error) {
        setMessage("Erreur lors de l'enregistrement.");
        return;
      }
      setMessage("Question enregistrée.");
      resetForm();
      setShowList(true);
      setTimeout(() => setMessage(null), 2000);
    });
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.append("id", id);
    startTransition(async () => {
      await deleteFaq(formData);
      if (selectedId === id) resetForm();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        className={`rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 ${
          showList ? "block" : "hidden lg:block"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">FAQ</p>
            <h2 className="text-lg font-semibold text-foreground">Liste des FAQ</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-inner focus:border-primary focus:outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter((e.target.value as string) || "ALL");
                setPage(1);
              }}
            >
              <option value="ALL">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {filteredFaqs.length} au total
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {pagedFaqs.map((faq) => (
            <article
              key={faq.id}
              className={cn(
                "rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-[0_10px_25px_rgba(5,15,35,0.05)]",
                faq.isValidated ? "border-l-4 border-l-primary" : "",
                faq.isFeatured ? "border-r-4 border-r-primary" : ""
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(faq.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    {faq.category?.name ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {faq.category.name}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 cursor-pointer"
                    onClick={() => populateFromFaq(faq)}
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 cursor-pointer text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(faq.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune question pour le moment.</p>
          ) : null}
        </div>

        {faqs.length > 0 ? (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
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
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        {message ? <AppMessage variant="success">{message}</AppMessage> : null}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
              {selectedId ? "Modifier la question" : "Nouvelle question"}
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              {selectedId ? "Mettre à jour" : "Ajouter une question"}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                resetForm();
                if (isMobile) setShowList(true);
              }}
              aria-label="Réinitialiser le formulaire"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              type="button"
              variant="default"
              className="cursor-pointer"
              onClick={() => {
                resetForm();
                if (isMobile) setShowList(false);
              }}
              aria-label="Nouvelle question"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle
            </Button>
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={submit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Question
            <Input
              required
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Quelle est la procédure ?"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Réponse
            <Textarea
              required
              name="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Expliquez clairement la réponse..."
              rows={4}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Catégorie
            <select
              name="categoryId"
              className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-inner focus:border-primary focus:outline-none cursor-pointer"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || undefined)}
            >
              <option value="">Sans catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-3">
            <div className="mr-auto flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border"
                  checked={isValidated}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIsValidated(next);
                    if (!next) setIsFeatured(false);
                  }}
                />
                Valider
              </label>
              {isValidated ? (
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-border"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  Mettre en avant
                </label>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={resetForm}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={pending}>
              {pending ? "En cours..." : selectedId ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
