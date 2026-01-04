import Link from "next/link";
import { Car, Mail, MapPin, PhoneCall } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { getSiteContact } from "@/lib/site-config";

const quickLinks = [
  { label: "Réserver un trajet", href: "/reserver" },
  { label: "Services", href: "/services" },
  { label: "Avis clients", href: "/avis" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const infoLinks = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/politique-de-confidentialite" },
  { label: "CGV", href: "/cgv" },
];

export async function SiteFooter() {
  const contact = await getSiteContact();
  const address = contact.address;
  const addressLine = `${address.streetNumber ? `${address.streetNumber} ` : ""}${address.street}, ${address.postalCode} ${address.city}`;
  return (
    <footer id="contact" className="mt-12 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Car className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-semibold">Taxi Tignieu</span>
              <span className="text-xs text-white/70">Mobilité premium région lyonnaise</span>
            </div>
          </div>
          <p className="text-sm text-white/75">
            Trajets aéroports, longues distances, VSL/CPAM et mises à disposition. Chauffeurs
            ponctuels et réservation simple 7j/7.
          </p>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/80">Contact</p>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              <a href={`tel:${contact.phone}`} className="hover:text-white">
                {contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${contact.email}`} className="hover:text-white">
                {contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-1 h-4 w-4" />
              <span>{addressLine}</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/80">Navigation</p>
          <ul className="space-y-2 text-sm text-white/80">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-wide text-white/80">Informations</p>
            <ul className="space-y-2 text-sm text-white/80">
              {infoLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Apparence
            </p>
            <ThemeToggle />
            <p className="mt-2 text-xs text-white/60">Choisissez le mode clair ou nuit.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Taxi Tignieu · Tous droits réservés</p>
          <p>Chauffeurs agréés · Disponibilité 24/7 · Paiement sécurisé</p>
        </div>
      </div>
    </footer>
  );
}
