import Link from "next/link";
import { auth } from "@/auth";
import { getPermissionsForUser, getUserRole } from "@/lib/permissions";

const cards = [
  {
    title: "Utilisateurs",
    href: "/dashboard/users",
    desc: "Rôles, infos, réservations",
    moduleId: "users",
  },
  {
    title: "Réservations",
    href: "/dashboard/bookings",
    desc: "Statuts, détails, nettoyage",
    moduleId: "bookings",
  },
  {
    title: "Services",
    href: "/dashboard/services",
    desc: "Catégories, textes, highlights",
    moduleId: "services",
  },
  {
    title: "Avis",
    href: "/dashboard/avis",
    desc: "Validation, édition, suppression",
    moduleId: "reviews",
  },
  {
    title: "Paramètres",
    href: "/dashboard/parametres",
    desc: "Pagination, contact, footer",
    moduleId: "site-info",
  },
  {
    title: "FAQ",
    href: "/dashboard/faq",
    desc: "Questions fréquentes, catégories",
    moduleId: "faq",
  },
  {
    title: "Rôles",
    href: "/dashboard/roles",
    desc: "Permissions manager par module",
    adminOnly: true,
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const role = getUserRole(session?.user ?? {});
  const isAdmin = role === "ADMIN";
  const perms = await getPermissionsForUser(session?.user ?? {});
  const visibleCards = cards.filter((card) => {
    if (card.adminOnly) return isAdmin;
    if (!card.moduleId) return true;
    const perm = perms[card.moduleId];
    return isAdmin || perm?.canView;
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-sidebar px-6 py-5 text-sidebar-foreground shadow-lg">
        <p className="text-xs uppercase tracking-[0.35em] text-white/70">Admin</p>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-white/80">Sélectionnez une section à gérer.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:border-primary/60"
          >
            <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
