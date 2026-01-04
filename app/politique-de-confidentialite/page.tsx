import type { Metadata } from "next";
import { getSiteContact } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const contact = await getSiteContact();
  const siteName = contact.name || "Taxi Tignieu Charvieu";
  return {
    title: `Politique de confidentialité | ${siteName}`,
    description:
      "Découvrez comment Taxi Tignieu Charvieu collecte, utilise et protège vos données personnelles conformément au RGPD.",
  };
}

const sections = [
  {
    title: "Responsable du traitement des données",
    content: [
      "Taxi Tignieu Charvieu",
      "Entreprise de taxi – Service de transport de personnes",
      "Zone d’intervention : Tignieu-Jameyzieu, Charvieu-Chavagneux et Est Lyonnais",
    ],
  },
  {
    title: "Données personnelles collectées",
    content: [
      "Nom et prénom",
      "Adresse e-mail",
      "Numéro de téléphone",
      "Adresse de prise en charge et de destination",
      "Date et heure de réservation",
      "Informations liées à la réservation (type de service, nombre de passagers, commentaires)",
      "Collecte via : formulaire de réservation, formulaire de contact, échanges téléphoniques ou email.",
    ],
  },
  {
    title: "Finalités du traitement",
    content: [
      "Gestion des réservations de taxi",
      "Prise de contact avec le client",
      "Exécution des prestations de transport",
      "Facturation et suivi administratif",
      "Respect des obligations légales (comptables)",
      "Aucune donnée utilisée à des fins commerciales non sollicitées.",
    ],
  },
  {
    title: "Base légale du traitement",
    content: [
      "Exécution d’un contrat (réservation d’un service de taxi)",
      "Consentement de l’utilisateur (formulaire de contact)",
      "Obligations légales applicables au transport de personnes",
    ],
  },
  {
    title: "Destinataires des données",
    content: [
      "Données destinées exclusivement à Taxi Tignieu Charvieu.",
      "Aucune vente, location ou cession à des tiers.",
      "Prestataires techniques éventuels uniquement pour le bon fonctionnement du site.",
    ],
  },
  {
    title: "Durée de conservation des données",
    content: [
      "Données de réservation : jusqu’à 3 ans après le dernier contact",
      "Données de facturation : 10 ans (obligations légales)",
      "Données de contact : 12 mois maximum",
    ],
  },
  {
    title: "Sécurité des données",
    content: [
      "Accès restreint aux données",
      "Hébergement sécurisé",
      "Protection contre l’accès non autorisé",
    ],
  },
  {
    title: "Droits des utilisateurs",
    content: [
      "Droit d’accès, rectification, effacement, limitation, opposition et portabilité",
      "Exerçables par email, réponse sous 30 jours.",
    ],
  },
  {
    title: "Cookies",
    content: [
      "Cookies strictement nécessaires au fonctionnement du site.",
      "Aucun cookie publicitaire ou de suivi sans consentement explicite.",
    ],
  },
  {
    title: "Services tiers (Google Maps…)",
    content: [
      "Intégration possible de services tiers pour améliorer l’expérience (ex. Google Maps).",
      "Ces services appliquent leur propre politique de confidentialité.",
    ],
  },
  {
    title: "Modification de la politique",
    content: [
      "La politique peut évoluer pour suivre les exigences légales ou techniques.",
      "La version en vigueur est celle publiée sur le site.",
    ],
  },
];

export default async function PrivacyPolicyPage() {
  const contact = await getSiteContact();
  const siteName = contact.name || "Taxi Tignieu Charvieu";
  const ownerName = contact.ownerName || siteName;
  const addressLine = `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${
    contact.address.street
  }, ${contact.address.postalCode} ${contact.address.city}, ${contact.address.country}`;

  return (
    <div className="bg-muted/30 pb-16 pt-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
        <header className="rounded-3xl bg-sidebar px-6 py-8 text-sidebar-foreground shadow-xl sm:px-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Politique RGPD</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Politique de confidentialité
          </h1>
          <p className="mt-3 text-white/75 sm:text-lg">
            Comment {siteName} collecte, utilise et protège vos données personnelles.
          </p>
        </header>

        <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                Responsable
              </p>
              <p className="text-foreground font-semibold">{ownerName}</p>
              <p className="text-foreground">{siteName}</p>
              <p>{addressLine}</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                📧{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  {contact.email}
                </a>
              </p>
              <p>
                📞{" "}
                <a
                  href={`tel:${contact.phone}`}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  {contact.phone}
                </a>
              </p>
              <p className="text-xs">
                Zone d’intervention : Tignieu-Jameyzieu, Charvieu-Chavagneux et Est Lyonnais
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          {sections.map((section, idx) => (
            <article key={section.title} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {idx + 1}
                </span>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              </div>
              <ul className="ml-12 list-disc space-y-1 text-sm text-muted-foreground">
                {section.content.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Nous contacter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour toute question relative à vos données personnelles ou pour exercer vos droits,
            contactez-nous.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-foreground">
            <a
              href={`mailto:${contact.email}`}
              className="cursor-pointer rounded-2xl border border-border px-4 py-2 font-semibold text-primary transition hover:bg-primary/10"
            >
              Écrire un email
            </a>
            <a
              href={`tel:${contact.phone}`}
              className="cursor-pointer rounded-2xl border border-border px-4 py-2 font-semibold text-primary transition hover:bg-primary/10"
            >
              Appeler
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
