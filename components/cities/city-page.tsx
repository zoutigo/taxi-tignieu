import Link from "next/link";
import { Car, CheckCircle2, MapPin, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { getSiteContact } from "@/lib/site-config";
import { getServiceGroups } from "@/app/services/data";
import type { CityInfo } from "@/lib/data/cities";
import React from "react";

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

const serviceKey = (title: string): string => {
  const norm = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (norm.includes("aeroport") || norm.includes("gare")) return "aeroport-gare";
  if (norm.includes("classique")) return "trajets-classiques";
  if (norm.includes("longue")) return "longue-distance";
  if (norm.includes("entreprise")) return "entreprises";
  if (norm.includes("seminaire")) return "seminaires";
  if (norm.includes("hotel")) return "hotels";
  if (norm.includes("scolaire")) return "scolaire";
  if (norm.includes("vsl") || norm.includes("cpam")) return "vsl-cpam";
  if (norm.includes("pmr")) return "pmr";
  return norm;
};

const cityServiceCopy: Record<string, Record<string, string>> = {
  tignieu: {
    "trajets-classiques":
      "Courses locales depuis Tignieu-Jameyzieu : quartiers des Balmes, écoles et zones d’activités, avec suivi d’approche.",
    "aeroport-gare":
      "Saint-Exupéry/Part-Dieu en direct depuis Tignieu, suivi des vols et accueil pancarte en arrivée.",
    "longue-distance":
      "Liaisons AuRA/Suisse depuis Tignieu, pauses planifiées, conduite souple et suivi partageable.",
    entreprises:
      "Navettes pro pour sites de Satolas et ZI proches, facturation claire pour vos équipes.",
    seminaires:
      "Coordination multi-pickup Tignieu–Chavanoz–Pont-de-Chéruy pour Eurexpo ou Groupama Stadium.",
    hotels:
      "Prise en charge hôtels/gîtes autour de Tignieu, transferts tôt le matin vers l’aéroport.",
    scolaire:
      "Ramassages scolaires Tignieu et hameaux, chauffeurs identifiés, communication parents.",
    "vsl-cpam": "VSL/CPAM vers Bourgoin ou Lyon, aide montée/descente, attente si besoin.",
    pmr: "Aide PMR personnalisée au départ de Tignieu, conduite adaptée et installation sécurisée.",
  },
  "charvieu-chavagneux": {
    "trajets-classiques":
      "Trajets Charvieu-centre, Veyssilieu et environs, réservation rapide et chauffeur local.",
    "aeroport-gare":
      "Saint-Exupéry en moins de 20 min, suivi des vols, assistance bagages et pancarte si demandé.",
    "longue-distance":
      "Départs Charvieu vers Lyon, Grenoble ou Valence, pauses prévues et confort berline/van.",
    entreprises:
      "Navettes d’équipes vers zones industrielles de Chavanoz/Satolas, facturation entreprise.",
    seminaires:
      "Groupes pour Eurexpo/OL Vallée, multi-points Charvieu–Pont-de-Chéruy, coordination horaire.",
    hotels: "Transferts hôtels/résidences autour de Charvieu, service 24/7 pour vols matinaux.",
    scolaire:
      "Parcours scolaires stables à Charvieu-Chavagneux, chauffeurs référencés, suivi parents.",
    "vsl-cpam": "Courses santé vers Bourgoin/Lyon, VSL conventionné, accompagnement discret.",
    pmr: "Prise en charge PMR locale, aide fauteuil, conduite douce jusqu’à destination.",
  },
  "pont-de-cheruy": {
    "trajets-classiques":
      "Courses quotidiennes Pont-de-Chéruy, commerces et établissements scolaires, suivi SMS.",
    "aeroport-gare":
      "Transferts directs Saint-Exupéry/Part-Dieu, suivi vols, pancarte et aide bagages.",
    "longue-distance":
      "Liaisons longue distance vers Alpes ou Lyon-centre, conduite souple et pauses sur demande.",
    entreprises:
      "Navettes pro pour A43, zones industrielles locales, reporting pour vos collaborateurs.",
    seminaires:
      "Déplacements salons Eurexpo/OL Vallée, multi-pickup Pont-de-Chéruy et communes voisines.",
    hotels: "Pick-up hôtels/Airbnb locaux, trajets matin/nuit vers aéroport et gares.",
    scolaire: "Transports scolaires Pont-de-Chéruy, chauffeurs identifiés et horaires fiables.",
    "vsl-cpam": "VSL/CPAM vers centres de soins Nord-Isère, assistance à l’installation.",
    pmr: "Mobilité PMR : aide fauteuil, installation sécurisée et conduite douce.",
  },
  cremieu: {
    "trajets-classiques":
      "Courses intra-muros Crémieu, remparts et hameaux alentours, chauffeur habitué aux ruelles.",
    "aeroport-gare":
      "Aéroport/gares lyonnaises depuis Crémieu, suivi des vols, accueil pancarte et bagages.",
    "longue-distance":
      "Liaisons vers Bourgoin, Chambéry ou stations de ski, pauses panoramiques possibles.",
    entreprises: "Navettes artisans/PME de Crémieu et ZI la Maladière, facturation claire.",
    seminaires:
      "Groupes vers Eurexpo ou lieux événementiels, coordination multi-stops Crémieu et villages.",
    hotels: "Hôtels de charme et gîtes de Crémieu, transferts 24/7 vers aéroport/gares.",
    scolaire: "Trajets scolaires Crémieu et villages proches, communication parentale régulière.",
    "vsl-cpam": "Courses santé vers Bourgoin ou Lyon, VSL/CPAM avec aide montée/descente.",
    pmr: "Prise en charge PMR au départ de Crémieu, aide fauteuil et conduite souple.",
  },
  meyzieu: {
    "trajets-classiques":
      "Déplacements Meyzieu-centre, T3 et zones d’activités, chauffeur disponible 24/7.",
    "aeroport-gare":
      "Saint-Exupéry via Rocade Est ou T3, suivi vols, accueil pancarte pour vos invités.",
    "longue-distance":
      "Liaisons Lyon-centre, Alpes ou Suisse, pauses planifiées, suivi partageable.",
    entreprises: "Navettes Parc OL / OL Vallée / ZAC des Gaulnes, reporting et facturation pro.",
    seminaires: "Multi-pickup Meyzieu–Décines–Genas pour Eurexpo, gestion horaires de groupe.",
    hotels: "Hôtels OL Vallée et alentours, transferts tôt/ tard vers gares/aéroport.",
    scolaire: "Transports scolaires Meyzieu/Décines, chauffeurs identifiés pour vos enfants.",
    "vsl-cpam": "Courses VSL vers HCL, Médipôle ou cliniques Est lyonnais, assistance à bord.",
    pmr: "Aide PMR locale, embarquement sécurisé et conduite adaptée.",
  },
  pusignan: {
    "trajets-classiques":
      "Courses Pusignan, Joly, Satolas : chauffeur de proximité, réservation simple.",
    "aeroport-gare":
      "Aéroport à quelques minutes : suivi des vols, pancarte et transfert Part-Dieu/Perrache.",
    "longue-distance": "Départs Pusignan vers Grenoble, Annecy ou Genève, confort berline ou van.",
    entreprises:
      "Navettes pour parcs logistiques et zones industrielles de l’Est lyonnais, facturation entreprise.",
    seminaires:
      "Coordination groupes pour Eurexpo et OL Vallée, multi-stops Pusignan/Saint-Laurent.",
    hotels: "Hôtels et résidences proches, trajets 24/7 pour vols matinaux.",
    scolaire: "Ramassages scolaires locaux, itinéraires réguliers et suivi parents.",
    "vsl-cpam": "VSL/CPAM vers hôpitaux/centres de soins, aide installation et dossiers.",
    pmr: "Prise en charge PMR, aide fauteuil et accompagnement vers rendez-vous médicaux.",
  },
  chavanoz: {
    "trajets-classiques":
      "Courses Chavanoz, zones d’activités et villages voisins, suivi SMS/WhatsApp.",
    "aeroport-gare":
      "Saint-Exupéry/Part-Dieu avec chauffeur local, assistance bagages et pancarte si besoin.",
    "longue-distance":
      "Liaisons vers Lyon, Bourgoin ou stations alpines, pauses prévues et conduite souple.",
    entreprises: "Navettes pro pour sites Chavanoz/Satolas, facturation claire pour vos équipes.",
    seminaires: "Eurexpo/Groupama : multi-pickup Chavanoz–Pont-de-Chéruy, coordination horaire.",
    hotels: "Hôtels/Airbnb locaux, transferts tôt et tard vers aéroport et gares.",
    scolaire: "Scolaire Chavanoz et hameaux, chauffeurs référencés et horaires fiables.",
    "vsl-cpam": "VSL conventionné vers centres de soins Nord-Isère, assistance aux patients.",
    pmr: "Mobilité PMR : aide fauteuil, installation sécurisée et conduite douce.",
  },
  janneyrias: {
    "trajets-classiques":
      "Courses locales Janneyrias, zones d’affaires et proximité aéroport, chauffeur de quartier.",
    "aeroport-gare":
      "Saint-Exupéry en quelques minutes : suivi vols, pancarte, transferts vers gares lyonnaises.",
    "longue-distance":
      "Liaisons vers Lyon-centre, Bourgoin ou Suisse, pauses planifiées et conduite souple.",
    entreprises: "Navettes pro pour parcs d’activités aéroport/Satolas, facturation simplifiée.",
    seminaires:
      "Groupes pour Eurexpo/OL Vallée, multi-pickup Janneyrias–Pusignan, gestion bagages.",
    hotels:
      "Hôtels/résidences proches de l’aéroport, transferts 24/7 vers gares/centres d’affaires.",
    scolaire: "Transports scolaires Janneyrias et communes voisines, chauffeurs identifiés.",
    "vsl-cpam": "VSL/CPAM vers hôpitaux lyonnais ou Nord-Isère, assistance montée/descente.",
    pmr: "Prise en charge PMR locale, aide fauteuil et conduite adaptée jusqu’au lieu médical.",
  },
};

const describeService = (slug: string, city: CityInfo): string => {
  const cityCopy = cityServiceCopy[city.slug]?.[slug];
  if (cityCopy) return cityCopy;
  const base = `${city.name} et l'Est lyonnais`;
  return `Service disponible sur ${base}, avec réservation simple et chauffeurs locaux.`;
};

export async function CityPage({ city }: Props) {
  const contact = await getSiteContact();
  const phoneHref = `tel:${contact.phone.replace(/\s+/g, "")}`;
  const featuredRaw = await pickFeaturedServices();
  const featured = featuredRaw.map((svc, idx) => ({
    ...svc,
    description: describeService(serviceKey(svc.title ?? `svc-${idx}`), city),
  }));
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const canonical = `${baseUrl}/${city.slug}`;

  const formatEuro = (cents?: number | null) => {
    if (!Number.isFinite(cents)) return null;
    return `${Math.round(Number(cents) / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} €`;
  };

  let apiPoiPrices: { label: string; price: string }[] | null = null;
  try {
    const res = await fetch(`${baseUrl}/api/featured-trips/public?slot=ZONE&withPrices=1`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const trip = (data?.trips ?? []).find(
        (t: { slug?: string; id?: string }) => t.slug === city.slug || t.id === city.slug
      );
      if (trip?.poiDestinations?.length) {
        apiPoiPrices = trip.poiDestinations
          .map((p: { label?: string; priceCents?: number | null }) => {
            const price = formatEuro(p.priceCents ?? null);
            return p.label && price ? { label: p.label, price } : null;
          })
          .filter(Boolean) as { label: string; price: string }[];
      }
    }
  } catch {
    // ignore API errors, fallback below
  }

  const poiPrices = apiPoiPrices?.length ? apiPoiPrices : city.poiPrices;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Taxi ${city.name}`,
    url: canonical,
    image: `${baseUrl}/images/mercedes-gare.png`,
    telephone: contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${contact.address.street}`,
      addressLocality: contact.address.city,
      postalCode: contact.address.postalCode,
      addressCountry: contact.address.country,
    },
    areaServed: city.name,
    priceRange: "€€",
    makesOffer: city.poiPrices.map((poi) => ({
      "@type": "Offer",
      name: `${city.name} → ${poi.label}`,
      price: poi.price.replace(/[^\d.,]/g, "").replace(",", "."),
      priceCurrency: "EUR",
    })),
  };

  return (
    <div className="bg-muted/20">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-sidebar px-6 py-10 text-sidebar-foreground shadow-[0_35px_70px_rgba(5,15,35,0.38)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                {city.heroTitle}
              </h1>
              <p className="text-lg text-white/85">{city.heroSubtitle}</p>
              <p className="max-w-3xl text-sm text-white/80 leading-relaxed">{city.description}</p>
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
                {poiPrices.map((poi) => (
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
