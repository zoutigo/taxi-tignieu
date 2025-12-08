import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ServiceDetailPanel } from "@/components/dashboard/service-detail-panel";

type Params = { slug: string };

export default async function DashboardServiceDetailPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const slug = Array.isArray(resolved.slug) ? resolved.slug[0] : resolved.slug;
  if (!slug) {
    return notFound();
  }

  const service = await prisma.service.findUnique({
    where: { slug },
    include: { category: true, highlights: { orderBy: { position: "asc" } } },
  });

  if (!service) return notFound();

  const categories = await prisma.sCategory.findMany({ orderBy: { position: "asc" } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux services
        </Link>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {service.category?.title}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">{service.title}</h1>
        <p className="text-sm text-muted-foreground">
          Éditez le slug, la catégorie, le texte multi-paragraphes et les highlights. Seuls les
          services activés apparaissent sur /services.
        </p>
      </div>

      <div className="mt-6">
        <ServiceDetailPanel service={JSON.parse(JSON.stringify(service))} categories={categories} />
      </div>
    </div>
  );
}
