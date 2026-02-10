import Link from "next/link";
import { Car, ArrowLeft, PhoneCall } from "lucide-react";
import { getSiteContact } from "@/lib/site-config";

export default async function NotFound() {
  const contact = await getSiteContact();
  const phone = contact.phone.trim() || "04 95 78 54 00";
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sidebar via-sidebar/95 to-background text-sidebar-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(246,196,49,0.45)]">
            <Car className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Navigation</p>
            <h1 className="font-display text-3xl text-white">Oups, destination introuvable</h1>
            <p className="text-sm text-white/70">
              La page demandée n&apos;existe pas ou a été déplacée. Nous vous ramenons sur la bonne
              route.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_35px_75px_rgba(0,10,30,0.4)] backdrop-blur">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Code 404</p>
              <h2 className="mt-2 font-display text-2xl text-white">On vous redirige ?</h2>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Retournez à l&apos;accueil, réservez un trajet ou contactez-nous directement pour
                une assistance.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:w-72">
              <Link href="/" className="btn btn-secondary inline-flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l&apos;accueil
              </Link>
              <Link href="/reserver" className="btn btn-primary inline-flex justify-center">
                Réserver un trajet
              </Link>
              <a
                href={phoneHref}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary/70 hover:text-primary"
              >
                <PhoneCall className="h-4 w-4" />
                Appeler le {phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
