import { prisma } from "@/lib/prisma";
import { ServicesAdminBoard } from "@/components/dashboard/services-admin-board";

export default async function DashboardServicesPage() {
  const categories = await prisma.sCategory.findMany({
    orderBy: { position: "asc" },
    include: {
      services: {
        orderBy: { position: "asc" },
        include: { highlights: { orderBy: { position: "asc" } } },
      },
    },
  });
  const initialCategories = JSON.parse(JSON.stringify(categories));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground">
          Catégories en premier, puis services regroupés par catégorie. Cliquez pour éditer, activer
          ou naviguer vers le détail d&apos;un service.
        </p>
      </div>
      <div className="mt-6">
        <ServicesAdminBoard initialCategories={initialCategories} />
      </div>
    </div>
  );
}
