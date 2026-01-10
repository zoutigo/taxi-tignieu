import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarCheck, MapPin, UserRound } from "lucide-react";
import { PhoneInlineEditor } from "@/components/phone-inline-editor";

export const metadata: Metadata = {
  title: "Espace client | Taxi Tignieu",
};

type ClientPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function ClientDashboardPage(props: ClientPageProps) {
  const resolvedSearchParams = await Promise.resolve(
    props.searchParams ?? ({} as Record<string, string | string[] | undefined>)
  );
  const bookingParam = resolvedSearchParams?.["booking"];
  const bookingSuccess =
    typeof bookingParam === "string" && bookingParam.toLowerCase() === "success";

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      isAdmin: true,
      isManager: true,
      isDriver: true,
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          userId: true,
          pickup: true,
          dropoff: true,
          dateTime: true,
          pax: true,
          luggage: true,
          babySeat: true,
          notes: true,
          priceCents: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customerId: true,
          driverId: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  if (!user.phone) {
    const params = new URLSearchParams({ from: "/espace-client" });
    redirect(`/profil/completer-telephone?${params.toString()}`);
  }

  if (!user.image) {
    const params = new URLSearchParams({ from: "/espace-client" });
    redirect(`/profil/choisir-avatar?${params.toString()}`);
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {bookingSuccess ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          Réservation enregistrée avec succès. Vous la retrouverez ci-dessous.
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface p-8">
          <p className="badge-pill mb-4 text-xs text-muted-foreground">Espace client</p>
          <h1 className="font-display text-3xl text-foreground">
            Bonjour {user.name ?? "cher client"} 👋
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Retrouvez ici l&apos;historique de vos trajets, vos demandes en cours et des raccourcis
            pour contacter directement votre chauffeur.
          </p>
          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
            Besoin d&apos;ajuster vos informations ?{" "}
            <Link
              href="/profil/completer-telephone"
              className="font-semibold text-primary cursor-pointer"
            >
              Modifier mon profil
            </Link>{" "}
            •{" "}
            <Link
              href="/espace-client/adresses"
              className="font-semibold text-primary cursor-pointer"
            >
              Gérer mes adresses
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
            <PhoneInlineEditor initialPhone={user.phone ?? ""} />
          </div>
        </div>

        <div className="surface p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Liens rapides
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Link
              href="/espace-client/bookings"
              className="flex h-full flex-col gap-2 rounded-xl border border-border/70 bg-primary/5 px-4 py-4 text-left transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <div className="flex items-center gap-2 text-primary">
                <CalendarCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Mes réservations</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Consulter, modifier ou reprendre vos trajets en cours.
              </p>
            </Link>
            <Link
              href="/espace-client/adresses"
              className="flex h-full flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 px-4 py-4 text-left transition hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-semibold">Mes adresses</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enregistrer vos lieux favoris et choisir l’adresse par défaut.
              </p>
            </Link>
            <Link
              href="/espace-client/infos-personelles"
              className="flex h-full flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 px-4 py-4 text-left transition hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <div className="flex items-center gap-2 text-primary">
                <UserRound className="h-4 w-4" />
                <span className="text-sm font-semibold">Mes infos personnelles</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mettre à jour votre téléphone, avatar et préférences.
              </p>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <p className="badge-pill bg-muted text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Réservations
        </p>
        <div className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-6 text-sm text-muted-foreground">
          Retrouvez et modifiez vos réservations dans l’espace dédié.
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/espace-client/bookings" className="btn btn-primary">
              Voir mes réservations
            </Link>
            <Link href="/reserver" className="btn" aria-label="Nouvelle réservation">
              Nouvelle demande
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
