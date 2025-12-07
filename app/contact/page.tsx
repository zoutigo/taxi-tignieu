import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { getSiteContact } from "@/lib/site-config";
import { ContactForm } from "@/components/contact-form";

export default async function ContactPage() {
  const contact = await getSiteContact();
  const addressLine = `${contact.address.streetNumber ? `${contact.address.streetNumber} ` : ""}${
    contact.address.street
  }, ${contact.address.postalCode} ${contact.address.city}, ${contact.address.country}`;

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
      </div>
    </div>
  );
}
