import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewsForm } from "@/components/reviews-form";

export const metadata: Metadata = {
  title: "Avis | Taxi Tignieu",
};

export default async function AvisPage() {
  const session = await auth();
  const existingReview =
    session?.user?.id &&
    ((await prisma.review.findFirst({
      where: { userId: session.user.id },
    })) ??
      null);
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-[28px] bg-gradient-to-r from-[#123873] to-[#0b2958] px-6 py-8 text-white shadow-[0_18px_40px_rgba(9,18,48,0.25)]">
        <p className="text-xs uppercase tracking-[0.35em] text-white/70">Avis</p>
        <h1 className="mt-2 font-display text-3xl">Avis de nos clients</h1>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Avis validés</h2>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                Aucun avis publié pour le moment.
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-amber-500">
                    {"★★★★★☆☆☆☆☆".slice(5 - review.rating, 10 - review.rating)}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {review.user?.name ?? "Client"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-[0_25px_60px_rgba(5,12,35,0.12)]">
          <h3 className="text-base font-semibold text-foreground">Laisser un avis</h3>
          {session?.user ? (
            existingReview ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Merci, vous avez déjà déposé un avis.
              </p>
            ) : (
              <ReviewsForm />
            )
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous pour déposer un avis.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
