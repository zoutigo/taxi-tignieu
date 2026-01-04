import Link from "next/link";
import { ShieldCheck, Settings2, ListChecks } from "lucide-react";
import { BackButton } from "@/components/back-button";

const tiles = [
  {
    title: "Informations du site",
    description:
      "Coordonnées, nom du site et responsable affichés dans le footer et les pages légales.",
    href: "/dashboard/parametres/site-info",
    Icon: ShieldCheck,
  },
  {
    title: "Tarifs",
    description: "Configurer les bases de calcul pour les estimations (Réserver, facturation).",
    href: "/dashboard/parametres/tarifs",
    Icon: Settings2,
  },
  {
    title: "Pagination dashboard",
    description:
      "Définir les tailles de page pour les tableaux (réservations, avis, utilisateurs).",
    href: "/dashboard/parametres/pagination",
    Icon: ListChecks,
  },
];

export default function ParametresNavigationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/70 sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Paramètres</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Centre de navigation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisissez une section pour configurer le site. Cette page sert de hub pour isoler les
          erreurs et faciliter le suivi.
        </p>
        <div className="mt-4">
          <BackButton label="Revenir au dashboard" href="/dashboard" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tiles.map(({ title, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex cursor-pointer flex-col gap-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <span className="text-sm font-semibold text-primary">Ouvrir</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-start">
        <BackButton label="Revenir au dashboard" href="/dashboard" />
      </div>
    </div>
  );
}
