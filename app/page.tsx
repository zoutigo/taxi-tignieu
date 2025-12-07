import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Hospital,
  MapPin,
  Navigation,
  PhoneCall,
  Plane,
  Quote,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSiteContact } from "@/lib/site-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

const services = [
  {
    title: "Aéroport",
    description: "Transferts vers Lyon Saint-Exupéry et gares régionales.",
    Icon: Plane,
  },
  {
    title: "Longue distance",
    description: "Courses toutes distances en France et en Europe.",
    Icon: Navigation,
  },
  {
    title: "Van & ski",
    description: "7 places confort pour séjours montagne et évènements.",
    Icon: Users,
  },
  {
    title: "VSL / CPAM",
    description: "Transport assis professionnalisé conventionné CPAM.",
    Icon: Hospital,
  },
];

export default async function Home() {
  const latestReviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, image: true } } },
    take: 3,
  });
  const contact = await getSiteContact();
  const addressLine = `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${
    contact.address.street
  }, ${contact.address.postalCode} ${contact.address.city}`;
  const phoneHref = `tel:${contact.phone.replace(/\s+/g, "")}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8">
      <section id="reserver" className="space-y-6">
        <div className="relative overflow-hidden rounded-[24px] border border-black/5 shadow-[0_35px_70px_rgba(1,7,18,0.35)] dark:border-white/10">
          <div className="absolute inset-0">
            <Image
              src="/images/mercedes-gare.png"
              alt="Taxi premium stationné devant la gare de Lyon-Saint-Exupéry"
              fill
              priority
              className="object-cover object-[center_70%]"
              sizes="(max-width: 1024px) 100vw, 1200px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/70 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 px-6 py-12 text-sidebar-foreground sm:px-10 lg:px-14">
            <span className="badge-pill bg-white/10 text-white/90">Service premium 24/7</span>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                À votre service pour tous vos trajets
              </h1>
              <p className="hidden max-w-2xl text-lg text-white/80 sm:block">
                Transferts aéroport, longues distances, VSL/CPAM, navettes entreprises. Des
                chauffeurs ponctuels, un suivi en temps réel et un confort haut de gamme.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href="/reserver"
                className="btn btn-primary w-full justify-center shadow-[0_30px_55px_rgba(246,196,49,0.45)] sm:flex-1 md:flex-none md:w-56"
              >
                Réserver maintenant
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={phoneHref}
                className="btn w-full justify-center border border-primary/90 bg-transparent text-white hover:border-primary hover:bg-primary/15 sm:flex-1 md:flex-none md:w-56"
              >
                Appeler
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border/70 bg-card px-5 py-5 text-sm text-muted-foreground sm:hidden">
          <p className="font-semibold text-foreground">Pourquoi nous choisir ?</p>
          <div className="mt-3 grid gap-2">
            <div>• Chauffeurs disponibles 24/7</div>
            <div>• Transferts aéroports, longues distances, VSL/CPAM</div>
            <div>• Suivi en temps réel et paiement sécurisé</div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6 rounded-[32px] border border-border/80 bg-card p-8 shadow-[0_35px_55px_rgba(5,15,35,0.08)]">
            <div className="flex flex-col gap-2">
              <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Nos services
              </p>
              <h2 className="font-display text-3xl text-foreground">
                Tous vos trajets, sur-mesure
              </h2>
              <p className="text-sm text-muted-foreground">
                Déplacements professionnels, transferts famille, navettes scolaires ou transport
                médicalisé : nous adaptons la flotte à vos besoins.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {services.map(({ title, description, Icon }) => (
                <div key={title} className="icon-tile items-start text-left">
                  <span className="rounded-2xl bg-muted px-4 py-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-border/70 bg-card px-6 py-8 text-center shadow-[0_35px_55px_rgba(5,15,35,0.12)]">
              <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
                Trajet type
              </p>
              <h3 className="mt-4 font-display text-2xl text-foreground">Tignieu → Aéroport</h3>
              <p className="text-sm text-muted-foreground">Lyon Saint-Exupéry ou Lyon Part-Dieu</p>
              <p className="mt-6 text-sm text-muted-foreground">à partir de</p>
              <p className="text-5xl font-semibold text-primary">35 €</p>
              <p className="text-xs text-muted-foreground">
                Tarif indicatif journée, 1 à 4 passagers
              </p>
            </div>

            <div className="rounded-[28px] border border-border/70 bg-sidebar px-6 py-8 text-sidebar-foreground shadow-[0_35px_55px_rgba(2,8,32,0.35)]">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Contacter</p>
              <h3 className="mt-4 font-display text-2xl text-white">Un chauffeur disponible</h3>
              <ul className="mt-6 space-y-3 text-sm text-white/90">
                <li className="flex items-center gap-3">
                  <PhoneCall className="h-4 w-4 text-primary" />
                  <a href={phoneHref} className="hover:text-primary">
                    {contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  {addressLine}
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Chauffeurs agréés & paiement sécurisé
                </li>
              </ul>
              <a
                href={`mailto:${contact.email}`}
                className="mt-6 inline-flex items-center text-sm font-semibold text-primary"
              >
                {contact.email}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border/70 bg-gradient-to-r from-sidebar via-sidebar/95 to-[#0d1a32] px-6 py-10 text-sidebar-foreground shadow-[0_35px_55px_rgba(2,8,32,0.35)] sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Confiance locale
            </p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Au service de l&apos;Est lyonnais depuis 2010
            </h2>
            <p className="text-sm text-white/80">
              Entreprises, particuliers, établissements de santé : une équipe de chauffeurs
              expérimentés qui connaît chaque route et chaque aéroport de la région.
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">+12 000 trajets réalisés</p>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Navettes aéroport, longues distances, VSL
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white">
                <Star className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Note moyenne 4.9 / 5</p>
              </div>
              <p className="mt-1 text-xs text-white/70">Avis vérifiés clients et partenaires</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Chauffeurs agréés & CPAM</p>
              </div>
              <p className="mt-1 text-xs text-white/70">Professionnels, discrets, assurés</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Disponibilité 24/7</p>
              </div>
              <p className="mt-1 text-xs text-white/70">Réponse immédiate, suivi en temps réel</p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="avis"
        className="grid gap-6 rounded-[32px] border border-border/70 bg-card p-8 shadow-[0_35px_55px_rgba(5,15,35,0.12)] lg:grid-cols-[1.3fr_0.7fr]"
      >
        <div className="space-y-4">
          <p className="badge-pill text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Avis clients
          </p>
          <h2 className="font-display text-3xl text-foreground">Ils nous font confiance</h2>
          {latestReviews.length ? (
            <div className="space-y-3">
              {latestReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-border/70 bg-gradient-to-r from-muted/60 to-card px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={rev.user?.image ?? undefined}
                          alt={rev.user?.name ?? "Client"}
                        />
                        <AvatarFallback>
                          {(rev.user?.name ?? "C").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {rev.user?.name ?? "Client"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="text-xs font-semibold text-muted-foreground">Note</span>
                      <span>{"★★★★★".slice(0, rev.rating)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-3 text-sm text-foreground">
                    <Quote className="mt-1 h-4 w-4 text-primary" />
                    <p>{rev.comment}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/avis"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Plus d&apos;avis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 shadow-inner">
              <Quote className="h-6 w-6 text-primary" />
              <p className="mt-3 text-lg text-foreground">
                “Service impeccable, chauffeur ponctuel et cordial. Je recommande vivement !”
              </p>
              <p className="mt-4 text-sm font-semibold text-muted-foreground">Sophie M.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="stat-card">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">4.9 / 5</h3>
            <p className="text-sm text-muted-foreground">Moyenne sur 320+ clients vérifiés</p>
          </div>
          <div className="stat-card">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">99 %</h3>
            <p className="text-sm text-muted-foreground">Trajets à l&apos;heure en 2024</p>
          </div>
          <div className="stat-card">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">15 min</h3>
            <p className="text-sm text-muted-foreground">Temps moyen de prise en charge</p>
          </div>
        </div>
      </section>
    </div>
  );
}
