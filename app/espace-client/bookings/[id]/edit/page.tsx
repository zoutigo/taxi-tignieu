import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReservationWizard } from "@/components/reservation-wizard";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditBookingPage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { pickup: true, dropoff: true },
  });
  if (!booking || booking.userId !== session.user.id) {
    notFound();
  }

  const date = booking.dateTime.toISOString().split("T")[0];
  const time = booking.dateTime.toISOString().split("T")[1]?.slice(0, 5) ?? "";

  const initialValues = {
    pickup: {
      label:
        booking.pickup?.name ||
        [booking.pickup?.streetNumber, booking.pickup?.street, booking.pickup?.city]
          .filter(Boolean)
          .join(" "),
      lat: booking.pickup?.latitude ?? NaN,
      lng: booking.pickup?.longitude ?? NaN,
      street: booking.pickup?.street ?? undefined,
      streetNumber: booking.pickup?.streetNumber ?? undefined,
      postcode: booking.pickup?.postalCode ?? undefined,
      city: booking.pickup?.city ?? undefined,
      country: booking.pickup?.country ?? undefined,
    },
    dropoff: {
      label:
        booking.dropoff?.name ||
        [booking.dropoff?.streetNumber, booking.dropoff?.street, booking.dropoff?.city]
          .filter(Boolean)
          .join(" "),
      lat: booking.dropoff?.latitude ?? NaN,
      lng: booking.dropoff?.longitude ?? NaN,
      street: booking.dropoff?.street ?? undefined,
      streetNumber: booking.dropoff?.streetNumber ?? undefined,
      postcode: booking.dropoff?.postalCode ?? undefined,
      city: booking.dropoff?.city ?? undefined,
      country: booking.dropoff?.country ?? undefined,
    },
    date,
    time,
    passengers: booking.pax,
    luggage: booking.luggage,
    notes: booking.notes ?? "",
    policiesAccepted: false,
  };

  const initialPrice = booking.priceCents ? booking.priceCents / 100 : null;

  return (
    <ReservationWizard
      mode="edit"
      bookingId={booking.id}
      initialValues={initialValues}
      initialPrice={initialPrice}
      successRedirect="/espace-client/bookings"
      useStore={false}
    />
  );
}
