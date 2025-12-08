import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle, MapPinned, PhoneCall } from "lucide-react";
import { notFound } from "next/navigation";
import { getSiteContact } from "@/lib/site-config";
import { getServiceGroups } from "@/app/services/data";

type Params = {
  slug: string;
};

export async function generateStaticParams() {
  const groups = await getServiceGroups({ includeDisabled: true });
  return groups.map((group) => ({ slug: group.slug }));
}

export default async function ServiceDetailPage({ params }: { params: Params }) {
  const groups = await getServiceGroups();
  const group = groups.find((g) => g.slug === params.slug);
  if (!group) return notFound();

  const contact = await getSiteContact();
  const phoneHref = `tel:${contact.phone.replace(/\s+/g, "")}`;

  return (
    <div className="bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-border/70 bg-sidebar px-6 py-10 text-sidebar-foreground shadow-[0_35px_70px_rgba(5,15,35,0.38)] sm:px-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-primary/70 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Tous les services
              </Link>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/70">
                {group.title}
              </span>
            </div>
            <div className="space-y-3">
              <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                {group.title}
              </p>
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                {group.summary}
              </h1>
              <p className="max-w-3xl text-sm text-white/80">
                Chauffeurs ponctuels, confort premium et suivi proactif : nous adaptons le véhicule,
                les horaires et le niveau d&apos;accompagnement pour répondre à chaque situation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/reserver"
                className="btn btn-primary justify-center shadow-[0_30px_55px_rgba(246,196,49,0.45)] sm:w-auto"
              >
                Réserver un trajet
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={phoneHref}
                className="btn border border-white/30 bg-white/5 text-white hover:border-primary hover:bg-primary/15"
              >
                <PhoneCall className="h-4 w-4" />
                {contact.phone}
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_30px_55px_rgba(5,15,35,0.08)] sm:p-8">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Détails des prestations
              </p>
              <h2 className="font-display text-3xl text-foreground">
                Ce que comprend {group.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                Chaque prestation inclut accueil soigné, ponctualité et un suivi proactif avant,
                pendant et après le trajet.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {group.items.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-background via-card to-muted/70 p-5 shadow-[0_20px_40px_rgba(5,15,35,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckCircle className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <div className="space-y-2 text-[15px] leading-relaxed text-muted-foreground">
                    {item.description
                      .split("\n")
                      .map((para) => para.trim())
                      .filter(Boolean)
                      .map((para) => (
                        <p key={para}>{para}</p>
                      ))}
                  </div>
                  {item.highlights?.length ? (
                    <ul className="grid gap-2 rounded-xl bg-white/60 p-3 text-sm text-foreground backdrop-blur dark:bg-black/15 sm:grid-cols-2">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(246,196,49,0.2)]" />
                          <span className="leading-relaxed">{h}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[24px] border border-border/70 bg-gradient-to-br from-card to-muted/80 px-6 py-8 shadow-[0_30px_55px_rgba(5,15,35,0.08)]">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Disponibilité
              </p>
              <h3 className="mt-3 font-display text-2xl text-foreground">Réactifs 24/7</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Confirmation rapide, suivi en temps réel et véhicule adapté (berline, van ou PMR).
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Demander un devis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-card px-6 py-8 text-sm text-muted-foreground shadow-[0_30px_55px_rgba(5,15,35,0.1)]">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Engagement
              </p>
              <div className="mt-3 space-y-3 text-foreground">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  Chauffeurs agréés, assurés et formés aux besoins spécifiques.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  Communication proactive : SMS/WhatsApp avant arrivée et à la prise en charge.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  Facturation claire, paiements sécurisés et dossier de course disponible.
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-foreground">
                <MapPinned className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Téléphone
                  </p>
                  <a href={phoneHref} className="font-semibold hover:text-primary">
                    {contact.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
