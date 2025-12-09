import Link from "next/link";
import { Car, CheckCircle2, MapPin, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { getSiteContact } from "@/lib/site-config";
import { getServiceGroups } from "@/app/services/data";
import type { CityInfo } from "@/app/cities/city-data";

type Props = {
  city: CityInfo;
};

const pickFeaturedServices = async () => {
  const groups = await getServiceGroups();
  const flat = groups.flatMap((g) =>
    g.items.map((item) => ({
      ...item,
      category: g.title,
    }))
  );
  return flat.slice(0, 6);
};

export async function CityPage({ city }: Props) {
  const contact = await getSiteContact();
  const phoneHref = `tel:${contact.phone.replace(/\s+/g, "")}`;
  const featured = await pickFeaturedServices();

  return (
    <div className="bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-sidebar px-6 py-10 text-sidebar-foreground shadow-[0_35px_70px_rgba(5,15,35,0.38)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
            <div className="space-y-4">
              <span className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                Taxi {city.name}
              </span>
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                {city.heroTitle}
              </h1>
              <p className="text-lg text-white/80">{city.heroSubtitle}</p>
              <p className="max-w-3xl text-sm text-white/80">{city.description}</p>
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
                  <PhoneCall className="h-4 w-4" />
                  {contact.phone}
                </a>
              </div>
              <div className="grid gap-2 text-sm text-white/80 sm:grid-cols-3">
                {city.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Estimations</p>
              <h3 className="mt-2 font-display text-2xl text-white">Tarifs indicatifs</h3>
              <p className="text-xs text-white/70">1 à 4 passagers - journée</p>
              <div className="mt-4 space-y-2 text-sm text-white/90">
                {city.poiPrices.map((poi) => (
                  <div
                    key={poi.label}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                  >
                    <span>{poi.label}</span>
                    <span className="font-semibold text-primary">{poi.price}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/70">
                Prix à titre indicatif, variables selon horaire et trafic.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/80 bg-card p-6 shadow-[0_30px_55px_rgba(5,15,35,0.08)] sm:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Services</p>
            <h2 className="font-display text-3xl text-foreground">
              Les essentiels autour de {city.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Les services les plus demandés par nos clients. Disponibles 24/7 avec suivi
              d&apos;approche et paiement sécurisé.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {featured.map((svc) => (
              <div
                key={`${svc.category}-${svc.title}`}
                className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-card to-muted/60 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {svc.category}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">{svc.title}</h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Car className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{svc.description}</p>
                {svc.highlights?.length ? (
                  <ul className="grid gap-1 text-sm text-foreground sm:grid-cols-2">
                    {svc.highlights.slice(0, 2).map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="leading-snug">{h}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_30px_55px_rgba(5,15,35,0.08)] sm:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">À propos</p>
            <h3 className="mt-2 font-display text-2xl text-foreground">
              Chauffeurs agréés, ancrés dans l&apos;Est lyonnais
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Conduite souple, accueil soigné et suivi proactif avant l&apos;arrivée. Nous
              connaissons les accès rapides vers l&apos;aéroport, Eurexpo et les gares lyonnaises
              pour limiter l&apos;attente.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Chauffeurs assurés & VSL/CPAM disponibles
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <Star className="h-4 w-4 text-primary" />
                Avis clients vérifiés et notés 4.8/5
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                Connaissance fine des communes voisines
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Confirmation rapide et suivi d&apos;approche
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-gradient-to-br from-card to-muted/80 px-6 py-8 shadow-[0_30px_55px_rgba(5,15,35,0.08)]">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Réserver ou appeler
            </p>
            <h3 className="mt-3 font-display text-2xl text-foreground">Besoin d&apos;un taxi ?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Contactez-nous en direct, ou réservez en ligne pour un devis rapide.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/reserver" className="btn btn-primary justify-center">
                Réserver en ligne
              </Link>
              <a
                href={phoneHref}
                className="btn border border-border bg-card text-foreground hover:border-primary"
              >
                <PhoneCall className="h-4 w-4" />
                {contact.phone}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="btn border border-border bg-card text-foreground hover:border-primary"
              >
                {contact.email}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
