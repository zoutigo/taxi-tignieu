import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { getSiteContact } from "@/lib/site-config";
import { ContactForm } from "@/components/contact-form";

export default async function ContactPage() {
  const contact = await getSiteContact();
  const addressLine = `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${
    contact.address.street
  }, ${contact.address.postalCode} ${contact.address.city}, ${contact.address.country}`;
  const mapQuery = encodeURIComponent(addressLine);
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <div className="bg-muted/30 pb-16 pt-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
        <div className="rounded-3xl bg-sidebar px-6 py-8 text-sidebar-foreground shadow-xl sm:px-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Nous contacter</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Restons en contact
          </h1>
          <p className="mt-2 text-white/70">
            Une question, un devis ou une mise à disposition ? Nous répondons rapidement, 7j/7.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
            <h2 className="text-lg font-semibold text-foreground">Coordonnées</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Infos synchronisées avec le footer et la base de données.
            </p>
            <div className="mt-4 space-y-4 text-sm text-foreground">
              <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                <Phone className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Téléphone</p>
                  <Link href={`tel:${contact.phone}`} className="font-semibold hover:text-primary">
                    {contact.phone}
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                <Mail className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Email</p>
                  <Link
                    href={`mailto:${contact.email}`}
                    className="font-semibold hover:text-primary"
                  >
                    {contact.email}
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                <MapPin className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Adresse</p>
                  <p className="font-semibold leading-relaxed">{addressLine}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
            <h2 className="text-lg font-semibold text-foreground">Formulaire de contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez une catégorie, précisez le sujet et décrivez votre demande.
            </p>
            <ContactForm />
          </section>
        </div>

        <section className="rounded-3xl bg-card p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nous situer</h2>
              <p className="text-sm text-muted-foreground">
                Adresse synchronisée depuis les infos du site.
              </p>
              <p className="mt-2 font-semibold text-foreground">{addressLine}</p>
            </div>
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_20px_rgba(245,195,49,0.35)] transition hover:brightness-95 focus:outline-none sm:mt-0"
            >
              Ouvrir dans Google Maps
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-muted shadow-inner">
            <div className="relative h-80 w-full">
              <iframe
                title="Localisation Taxi Tignieu"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
                allowFullScreen
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]"
              />
              <span className="sr-only">Localisation exacte de l&apos;entreprise</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
