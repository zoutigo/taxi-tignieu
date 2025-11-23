import Link from "next/link";

const cards = [
  { title: "Utilisateurs", href: "/dashboard/users", desc: "Rôles, infos, réservations" },
  { title: "Réservations", href: "/dashboard/bookings", desc: "Statuts, détails, nettoyage" },
  { title: "Avis", href: "/dashboard/avis", desc: "Validation, édition, suppression" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-sidebar px-6 py-5 text-sidebar-foreground shadow-lg">
        <p className="text-xs uppercase tracking-[0.35em] text-white/70">Admin</p>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-white/80">Sélectionnez une section à gérer.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
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
