import { prisma } from "@/lib/prisma";
import { FaqManager } from "@/components/dashboard/faq-manager";
import { BackButton } from "@/components/back-button";

export const metadata = {
  title: "FAQ | Dashboard",
};

export default async function DashboardFaqPage() {
  const categories = await prisma.faqCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const faqs = await prisma.faq.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  const safeFaqs = faqs.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    createdAt: f.createdAt.toISOString(),
    isFeatured: f.isFeatured,
    isValidated: f.isValidated,
    category: f.category ? { id: f.category.id, name: f.category.name } : null,
  }));

  const safeCategories = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">FAQ</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Questions & Réponses
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez, mettez à jour ou supprimez les questions fréquentes affichées sur le site.
          </p>
        </div>
        <BackButton label="Retour" href="/dashboard" />
      </div>

      <div className="mt-8">
        <FaqManager faqs={safeFaqs} categories={safeCategories} />
      </div>
    </div>
  );
}
