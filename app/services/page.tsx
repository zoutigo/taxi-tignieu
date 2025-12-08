import { Briefcase, Car, Crown, HeartPulse, MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";
import { getSiteContact } from "@/lib/site-config";
import { getServiceGroups } from "@/app/services/data";

const iconBySlug = {
  particuliers: Car,
  professionnels: Briefcase,
  specialises: HeartPulse,
  premium: Crown,
  bonus: Sparkles,
} as const;

export default async function ServicesPage() {
  const contact = await getSiteContact();
  const phoneHref = `tel:${contact.phone.replace(/\s+/g, "")}`;
  const serviceGroups = await getServiceGroups();

  return (
    <div className="bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-border/70 bg-sidebar px-6 py-10 text-sidebar-foreground shadow-[0_35px_70px_rgba(5,15,35,0.38)] sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                Nos services
              </p>
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                Des trajets sur-mesure pour chaque besoin
              </h1>
              <p className="max-w-3xl text-sm text-white/80">
                Aéroport, longue distance, VSL ou navettes entreprises : nos chauffeurs couvrent
                toutes vos demandes avec suivi en temps réel et confort premium.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/reserver"
                className="btn btn-primary justify-center shadow-[0_30px_55px_rgba(246,196,49,0.45)] sm:w-auto"
              >
                Réserver un trajet
              </Link>
              <a
                href={phoneHref}
                className="btn border border-white/30 bg-white/5 text-white hover:border-primary hover:bg-primary/15"
              >
                <MapPinned className="h-4 w-4" />
                {contact.phone}
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-card p-6 shadow-[0_35px_55px_rgba(5,15,35,0.08)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute right-0 top-10 h-40 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Catalogue complet
              </p>
              <h2 className="font-display text-3xl text-foreground">Toutes nos expertises</h2>
              <p className="text-sm text-muted-foreground">
                Un seul partenaire pour vos déplacements quotidiens, professionnels, médicaux ou
                événementiels.
              </p>
            </div>

            <div className="relative mt-6 grid gap-4 md:grid-cols-2">
              {serviceGroups.map((group) => {
                const Icon = iconBySlug[group.slug as keyof typeof iconBySlug] ?? Car;
                return (
                  <div
                    key={group.title}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-card to-muted/70 p-5 shadow-[0_20px_40px_rgba(5,15,35,0.08)] backdrop-blur"
                  >
                    <Link
                      href={`/services/${group.slug}`}
                      className="absolute inset-0 z-10"
                      aria-label={`Découvrir les services ${group.title}`}
                    />
                    <div className="absolute right-3 top-3 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition duration-300 group-hover:scale-110 group-hover:bg-primary/20" />
                    <div className="relative flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {group.items.length} prestations
                        </p>
                      </div>
                    </div>
                    <p className="relative mt-3 text-sm text-muted-foreground">{group.summary}</p>
                    <ul className="relative mt-4 space-y-2 text-sm text-foreground">
                      {group.items.map((item) => (
                        <li
                          key={item.title}
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-white/60 px-3 py-2 shadow-sm backdrop-blur dark:bg-black/15"
                        >
                          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(246,196,49,0.2)]" />
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[24px] border border-border/70 bg-gradient-to-br from-card to-muted/80 px-6 py-8 shadow-[0_30px_55px_rgba(5,15,35,0.08)]">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Disponibilité
              </p>
              <h3 className="mt-3 font-display text-2xl text-foreground">
                24/7, même en dernière minute
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Chauffeur dédié, suivi d&apos;arrivée, paiement sécurisé et véhicule adapté
                (berline, van, PMR).
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Demander un devis
              </Link>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card px-6 py-8 text-sm text-muted-foreground shadow-[0_30px_55px_rgba(5,15,35,0.1)]">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Engagement
              </p>
              <div className="mt-3 space-y-2 text-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Chauffeurs agréés et formés PMR & VSL
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Suivi temps réel & communication proactive
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Facturation claire pour entreprises & hôtels
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
