import { auth } from "@/auth";
import { InvoiceEditForm } from "@/components/dashboard/invoice-edit-form";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const { id: invoiceId } = await params;
  if (!invoiceId) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      booking: {
        include: {
          pickup: true,
          dropoff: true,
          user: { select: { name: true, email: true } },
          customer: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const computeDistanceKm = () => {
    const lat1 = invoice.booking?.pickup?.latitude;
    const lon1 = invoice.booking?.pickup?.longitude;
    const lat2 = invoice.booking?.dropoff?.latitude;
    const lon2 = invoice.booking?.dropoff?.longitude;
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

  const client =
    invoice.booking?.user?.name ??
    invoice.booking?.customer?.fullName ??
    invoice.booking?.user?.email ??
    "Client inconnu";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold text-foreground">Modifier la facture</h1>
        <p className="text-sm text-muted-foreground">
          Client : <span className="font-medium text-foreground">{client}</span>
        </p>
        <p className="text-sm text-muted-foreground">Réservation : {invoice.bookingId}</p>
        <p className="text-sm text-muted-foreground">
          Date de facturation :{" "}
          {invoice.issuedAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <InvoiceEditForm
        invoiceId={invoice.id}
        mode="edit"
        defaultValues={{
          bookingId: invoice.bookingId,
          amountEuros: Number(invoice.amount),
          issuedAt: invoice.issuedAt.toISOString(),
          pdfPath: invoice.pdfPath,
          realKm: invoice.realKm != null ? Number(invoice.realKm) : estimatedKm,
          estimatedLuggage: invoice.booking?.luggage ?? undefined,
          realLuggage:
            invoice.realLuggage != null ? Number(invoice.realLuggage) : invoice.booking?.luggage,
          estimatedPax: invoice.booking?.pax ?? undefined,
          realPax: invoice.realPax != null ? Number(invoice.realPax) : invoice.booking?.pax,
          waitHours:
            invoice.waitHours != null
              ? Number(invoice.waitHours)
              : typeof (invoice.booking as { waitHours?: number } | null | undefined)?.waitHours ===
                  "number"
                ? ((invoice.booking as { waitHours?: number } | null | undefined)?.waitHours ?? 0)
                : 0,
          sendToClient: invoice.sendToClient ?? true,
          adjustmentComment: invoice.adjustmentComment ?? "",
          paid: invoice.paid ?? true,
          paymentMethod: invoice.paymentMethod ?? "CB",
        }}
        bookingSummary={{
          id: invoice.bookingId,
          pickup:
            invoice.booking?.pickup?.name ||
            [invoice.booking?.pickup?.streetNumber, invoice.booking?.pickup?.street]
              .filter(Boolean)
              .join(" "),
          dropoff:
            invoice.booking?.dropoff?.name ||
            [invoice.booking?.dropoff?.streetNumber, invoice.booking?.dropoff?.street]
              .filter(Boolean)
              .join(" "),
          dateTime: invoice.booking?.dateTime?.toISOString(),
          client: client,
          estimatedKm,
          estimatedLuggage: invoice.booking?.luggage ?? undefined,
          estimatedPax: invoice.booking?.pax ?? undefined,
          estimatedAmount:
            invoice.amount != null
              ? Number(invoice.amount)
              : invoice.booking?.priceCents
                ? invoice.booking.priceCents / 100
                : undefined,
        }}
      />
    </div>
  );
}
