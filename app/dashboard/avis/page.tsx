import { prisma } from "@/lib/prisma";
import { ReviewsAdminTable } from "@/components/dashboard/reviews-admin-table";
import { BackButton } from "@/components/back-button";

export default async function DashboardAvisPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Avis</h1>
          <p className="text-sm text-muted-foreground">Valider, éditer ou supprimer les avis.</p>
        </div>
        <BackButton label="Retour au dashboard" href="/dashboard" />
      </div>
      <div className="mt-6">
        <ReviewsAdminTable initialReviews={JSON.parse(JSON.stringify(reviews))} />
      </div>
    </div>
  );
}
