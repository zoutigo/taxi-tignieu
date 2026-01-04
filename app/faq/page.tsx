import Link from "next/link";
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FAQ_ITEMS } from "@/lib/data/seed-static-data";

export const metadata = {
  title: "FAQ | Taxi Tignieu Charvieu",
  description:
    "Questions fréquentes sur les réservations, tarifs, zones desservies et services Taxi Tignieu. Trouvez vos réponses en un clin d'œil.",
};

type CategoryBlock = {
  name: string;
  faqs: { question: string; answer: string }[];
};

const buildFallback = (): CategoryBlock[] =>
  Object.entries(FAQ_ITEMS).map(([name, items]) => ({
    name,
    faqs: items.map((item) => ({ question: item.question, answer: item.answer })),
  }));

export default async function FaqPage() {
  const categories = await prisma.faqCategory.findMany({
    include: {
      faqs: {
        where: { isValidated: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const hasValidated = categories.some((cat) => cat.faqs.length > 0);
  const blocks: CategoryBlock[] = hasValidated
    ? categories
        .filter((cat) => cat.faqs.length > 0)
        .map((cat) => ({
          name: cat.name,
          faqs: cat.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
        }))
    : buildFallback();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-14 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            FAQ
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <MessageCircleQuestion className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-3xl text-foreground sm:text-4xl">
                Questions & Réponses
              </h1>
              <p className="text-sm text-muted-foreground">
                Réservations, tarifs, zones couvertes, services : vos réponses en un clic.
              </p>
            </div>
          </div>
        </div>
        <Link href="/contact" className="btn btn-primary justify-center">
          Une autre question ?
          <Sparkles className="h-4 w-4" />
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {blocks.map((block) => (
          <div
            key={block.name}
            className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-[0_24px_50px_rgba(5,15,35,0.1)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="badge-pill bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary">
                  {block.name}
                </span>
              </div>
              <div className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:inline-flex">
                {block.faqs.length} réponses
              </div>
            </div>
            <div className="divide-y divide-border/70">
              {block.faqs.map((faq, idx) => (
                <details
                  key={`${block.name}-${idx}-${faq.question}`}
                  className="group py-4 transition"
                >
                  <summary className="flex cursor-pointer items-start justify-between gap-3 text-left text-foreground transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    <span className="text-base font-semibold leading-6">{faq.question}</span>
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary opacity-75 group-open:opacity-100" />
                  </summary>
                  <div className="mt-3 rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
