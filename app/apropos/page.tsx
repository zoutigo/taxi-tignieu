import Image from "next/image";
import { CheckCircle2, Clock3, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

const points = [
  {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    title: "Chauffeurs expérimentés",
    desc: "Locaux, discrets, formés à l’accueil et à la conduite sécurisée.",
  },
  {
    icon: <Clock3 className="h-5 w-5 text-primary" />,
    title: "Disponible 24h/24",
    desc: "Prise en charge immédiate ou réservée, toute la semaine.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-sky-500" />,
    title: "Sécurité & confort",
    desc: "Véhicules entretenus, suivi de course, paiement sécurisé.",
  },
];

const stats = [
  { label: "Courses réalisées", value: "25 000+" },
  { label: "Années d’expérience", value: "12 ans" },
  { label: "Temps moyen d’arrivée", value: "8 min" },
  { label: "Note moyenne", value: "4.9 / 5" },
  { label: "Disponibilité", value: "7j/7 - 24h/24" },
];

export default function AproposPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">À propos</p>
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Votre chauffeur professionnel à Tignieu et alentours
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Transferts gares et aéroports, rendez-vous pros, événements. Une équipe locale,
            ponctuelle et humaine qui connaît vos trajets et vos contraintes.
          </p>

          <div className="space-y-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            {points.map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="mt-1">{item.icon}</div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl bg-gradient-to-r from-sidebar/90 to-[#0b2958] p-5 text-white sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-4 py-3 shadow-inner">
                <p className="text-sm text-white/80">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Réserver un trajet
            </Link>
            <Link
              href="tel:+33612345678"
              className="inline-flex items-center justify-center rounded-full border border-primary/30 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Appeler un chauffeur
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="overflow-hidden rounded-3xl shadow-[0_25px_70px_rgba(6,19,46,0.2)]">
            <Image
              src="/images/apropos-clients.png"
              alt="Client et chauffeur en berline"
              width={900}
              height={600}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="overflow-hidden rounded-3xl shadow-[0_25px_70px_rgba(6,19,46,0.2)]">
            <Image
              src="https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80"
              alt="Mercedes berline Taxi Tignieu"
              width={900}
              height={600}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-border/80 bg-card px-4 py-3 text-sm text-foreground shadow-sm">
            <Star className="h-5 w-5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Claire, cliente fidèle</p>
              <p className="text-muted-foreground">
                “Service impeccable, chauffeur ponctuel et très professionnel. Je recommande
                vivement Taxi Tignieu.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
