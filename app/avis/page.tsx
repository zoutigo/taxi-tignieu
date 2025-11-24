import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewsForm } from "@/components/reviews-form";
import { ReviewsPublicList } from "@/components/reviews-public-list";

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
    include: { user: { select: { name: true, image: true } } },
  });
  const total = reviews.length;
  const average = total ? reviews.reduce((acc, r) => acc + r.rating, 0) / total : 0;
  const starFill = Math.max(0, Math.min(5, average));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-[28px] bg-gradient-to-r from-sidebar to-[#0b2958] px-6 py-8 text-white shadow-[0_18px_40px_rgba(9,18,48,0.25)]">
        <p className="text-xs uppercase tracking-[0.35em] text-white/70">Avis de nos clients</p>
        <h1 className="mt-2 font-display text-3xl">Ce que disent nos passagers</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 shadow-inner">
            <span className="font-semibold">Moyenne :</span> {average.toFixed(1)} / 5{" "}
            <span className="relative inline-flex items-center text-base leading-none">
              <span className="text-white/30">★★★★★</span>
              <span
                className="absolute left-0 top-0 overflow-hidden text-primary"
                style={{ width: `${(starFill / 5) * 100}%` }}
              >
                ★★★★★
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 shadow-inner">
            <span className="font-semibold">Total :</span> {total}
          </span>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">Connectez vous pour laisser un avis.</p>

      <section className="space-y-6">
        <ReviewsPublicList reviews={JSON.parse(JSON.stringify(reviews))} />
        {session?.user && !existingReview ? (
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-[0_25px_60px_rgba(5,12,35,0.12)]">
            <h3 className="text-base font-semibold text-foreground">Laisser un avis</h3>
            <ReviewsForm />
          </div>
        ) : null}
      </section>
    </div>
  );
}
