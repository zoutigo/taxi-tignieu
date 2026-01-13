import { redirect, notFound } from "next/navigation";

import { auth } from "@/auth";
import { InvoiceEditForm } from "@/components/dashboard/invoice-edit-form";
import { prisma } from "@/lib/prisma";
import { InvoiceCreateBanner } from "@/components/dashboard/invoice-create-banner";

export default async function InvoiceCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; from?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const { bookingId, from } = await searchParams;
  if (!bookingId) {
    redirect("/dashboard/bookings");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      pickup: true,
      dropoff: true,
      user: { select: { name: true, email: true } },
      customer: { select: { fullName: true, email: true } },
    },
  });

  if (!booking) {
    notFound();
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const computeDistanceKm = () => {
    const lat1 = booking.pickup?.latitude;
    const lon1 = booking.pickup?.longitude;
    const lat2 = booking.dropoff?.latitude;
    const lon2 = booking.dropoff?.longitude;
    if (
      lat1 == null ||
      lon1 == null ||
      lat2 == null ||
      lon2 == null ||
      Number.isNaN(lat1) ||
      Number.isNaN(lon1) ||
      Number.isNaN(lat2) ||
      Number.isNaN(lon2)
    ) {
      return undefined;
    }
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const la1 = toRad(lat1);
    const la2 = toRad(lat2);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  };

  const estimatedKm = computeDistanceKm();
  const estimatedAmount = booking.priceCents ? booking.priceCents / 100 : 0;
  const client =
    booking.user?.name ??
    booking.customer?.fullName ??
    booking.user?.email ??
    booking.customer?.email ??
    "Client inconnu";
  const bannerMessage =
    from === "complete" ? "La course a été terminée et une facture peut être générée." : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      {bannerMessage ? (
        <InvoiceCreateBanner message={bannerMessage} bookingId={booking.id} />
      ) : null}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold text-foreground">Créer une facture</h1>
        <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <span className="text-sm text-muted-foreground md:flex md:items-center md:gap-2 md:pr-3 md:border-r md:border-border/60 last:md:border-r-0 last:md:pr-0">
            <span className="font-semibold text-foreground">Client</span>
            <span className="text-foreground">{client}</span>
          </span>
          <span className="text-sm text-muted-foreground md:flex md:items-center md:gap-2 md:pr-3 md:border-r md:border-border/60 last:md:border-r-0 last:md:pr-0">
            <span className="font-semibold text-foreground">Réservation</span>
            <span className="text-foreground">{booking.id}</span>
          </span>
          {booking.dateTime ? (
            <span className="text-sm text-muted-foreground md:flex md:items-center md:gap-2 md:pr-3 md:border-r md:border-border/60 last:md:border-r-0 last:md:pr-0">
              <span className="font-semibold text-foreground">Course</span>
              <span className="text-foreground">
                {booking.dateTime.toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <InvoiceEditForm
        mode="create"
        defaultValues={{
          bookingId: booking.id,
          amountEuros: estimatedAmount,
          issuedAt: new Date().toISOString(),
          pdfPath: "",
          realKm: estimatedKm,
          estimatedLuggage: booking.luggage ?? undefined,
          realLuggage: booking.luggage ?? undefined,
          estimatedPax: booking.pax ?? undefined,
          realPax: booking.pax ?? undefined,
          waitHours:
            typeof (booking as { waitHours?: number } | null | undefined)?.waitHours === "number"
              ? ((booking as { waitHours?: number } | null | undefined)?.waitHours ?? 0)
              : 0,
          sendToClient: true,
          adjustmentComment: "",
        }}
        bookingSummary={{
          id: booking.id,
          pickup:
            booking.pickup?.name ||
            [booking.pickup?.streetNumber, booking.pickup?.street].filter(Boolean).join(" "),
          dropoff:
            booking.dropoff?.name ||
            [booking.dropoff?.streetNumber, booking.dropoff?.street].filter(Boolean).join(" "),
          dateTime: booking.dateTime?.toISOString(),
          client,
          estimatedKm,
          estimatedLuggage: booking.luggage ?? undefined,
          estimatedPax: booking.pax ?? undefined,
          estimatedAmount,
        }}
      />
    </div>
  );
}
