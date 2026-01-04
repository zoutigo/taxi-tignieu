import type { Metadata } from "next";
import { getSiteContact } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const contact = await getSiteContact();
  const siteName = contact.name || "Taxi Tignieu Charvieu";
  return {
    title: `Mentions légales | ${siteName}`,
    description: `Mentions légales du site ${siteName} : éditeur, hébergeur, responsabilité et droits applicables.`,
  };
}

const sections = [
  {
    title: "Cadre légal",
    items: [
      "Conformément aux articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004 pour la Confiance dans l’Économie Numérique (LCEN), les présentes mentions légales sont portées à la connaissance des utilisateurs du site taxi-tignieu-charvieu.fr.",
    ],
  },
  {
    title: "Éditeur du site",
    items: [
      "Taxi Tignieu Charvieu",
      "Activité : Taxi – Transport de personnes",
      "Zone d’intervention : Tignieu-Jameyzieu, Charvieu-Chavagneux, Est Lyonnais",
      "Statut juridique : À compléter (Auto-entrepreneur / EI ou Société)",
      "Numéro SIRET : À compléter",
      "Code APE / NAF : À compléter (ex : 4932Z – Transports de voyageurs par taxis)",
    ],
  },
  {
    title: "Directeur de la publication",
    items: ["Le responsable de Taxi Tignieu Charvieu"],
  },
  {
    title: "Hébergement du site",
    items: [
      "o2switch",
      "222 Boulevard Gustave Flaubert, 63000 Clermont-Ferrand – France",
      "📞 04 44 44 60 40",
      "🌐 https://www.o2switch.fr",
    ],
  },
  {
    title: "Propriété intellectuelle",
    items: [
      "Contenus protégés par le Code de la propriété intellectuelle : textes, images, logos, graphismes, icônes, structure du site.",
      "Toute reproduction ou adaptation sans accord écrit de Taxi Tignieu Charvieu est interdite.",
    ],
  },
  {
    title: "Responsabilité",
    items: [
      "Informations fournies aussi précises que possible.",
      "Pas de responsabilité en cas d’omissions, inexactitudes, carences de mise à jour ou dommages résultant de l’accès/usage du site.",
    ],
  },
  {
    title: "Liens hypertextes",
    items: [
      "Des liens vers des sites tiers peuvent exister.",
      "Taxi Tignieu Charvieu n’est pas responsable du contenu ou des pratiques de ces sites.",
    ],
  },
  {
    title: "Données personnelles",
    items: [
      "Les modalités de collecte et traitement sont détaillées dans la page Politique de confidentialité.",
      "Accessible depuis le site.",
    ],
  },
  {
    title: "Cookies",
    items: [
      "Cookies strictement nécessaires au bon fonctionnement du site.",
      "Pour plus d’informations, consulter la Politique de confidentialité.",
    ],
  },
  {
    title: "Droit applicable et juridiction compétente",
    items: [
      "Mentions légales régies par le droit français.",
      "En cas de litige non résolu à l’amiable, seuls les tribunaux français sont compétents.",
    ],
  },
];

export default async function MentionsLegalesPage() {
  const contact = await getSiteContact();
  const siteName = contact.name || "Taxi Tignieu Charvieu";
  const owner = contact.ownerName || "Responsable Taxi Tignieu Charvieu";
  const addressLine = `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${
    contact.address.street
  }, ${contact.address.postalCode} ${contact.address.city}, ${contact.address.country}`;

  return (
    <div className="bg-muted/30 pb-16 pt-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
        <header className="rounded-3xl bg-sidebar px-6 py-8 text-sidebar-foreground shadow-xl sm:px-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Mentions légales</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Mentions légales</h1>
          <p className="mt-3 text-white/75 sm:text-lg">
            Informations légales relatives au site {siteName} et à son éditeur.
          </p>
        </header>

        <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Éditeur</p>
              <p className="text-foreground font-semibold">{siteName}</p>
              <p className="text-foreground">{owner}</p>
              <p>{addressLine}</p>
              <p className="text-xs">
                SIRET : {contact.siret || "À compléter"} • Code APE : {contact.ape || "À compléter"}
              </p>
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
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Nous contacter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour toute question relative aux présentes mentions légales ou au site, contactez-nous.
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
