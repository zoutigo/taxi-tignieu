import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingsManager } from "@/components/bookings-manager";

export const metadata: Metadata = {
  title: "Mes réservations | Taxi Tignieu",
};

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function ClientBookingsPage(props: PageProps) {
  const resolvedSearchParams = await Promise.resolve(
    props.searchParams ?? ({} as Record<string, string | string[] | undefined>)
  );
  const bookingSuccess =
    typeof resolvedSearchParams["booking"] === "string" &&
    resolvedSearchParams["booking"]?.toLowerCase() === "success";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      bookings: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          pickup: true,
          dropoff: true,
          dateTime: true,
          pax: true,
          luggage: true,
          priceCents: true,
          status: true,
          driverId: true,
          driver: { select: { name: true, phone: true } },
          createdAt: true,
          updatedAt: true,
          bookingNotes: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!user) redirect("/");
  if (!user.phone) redirect("/profil/completer-telephone?from=/espace-client/bookings");
  if (!user.image) redirect("/profil/choisir-avatar?from=/espace-client/bookings");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {bookingSuccess ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          Réservation enregistrée avec succès. Vous la retrouverez ci-dessous.
        </div>
      ) : null}

      <div className="surface mb-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="badge-pill text-xs text-muted-foreground">Mes réservations</p>
          <h1 className="font-display text-3xl text-foreground">Historique & modifications</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos demandes, ajustez une adresse ou annulez une course à venir.
          </p>
        </div>
        <Link href="/reserver" className="btn btn-primary">
          Nouvelle demande
        </Link>
      </div>

      <BookingsManager
        initialBookings={
          user.bookings.map(({ driver, ...rest }) => ({
            ...rest,
            driverName: driver?.name ?? null,
            driverPhone: driver?.phone ?? null,
          })) as unknown as Parameters<typeof BookingsManager>[0]["initialBookings"]
        }
      />
    </div>
  );
}
