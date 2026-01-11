import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";
import { BackButton } from "@/components/back-button";

export default async function DashboardBookingsPage() {
  const session = await auth();
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pickup: true,
      dropoff: true,
      bookingNotes: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  const formatAddress = (
    addr: {
      name?: string | null;
      street?: string | null;
      streetNumber?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
    } | null
  ) => {
    if (!addr) return "—";
    if (addr.name) return addr.name;
    const parts = [addr.streetNumber, addr.street, addr.postalCode, addr.city, addr.country]
      .filter(Boolean)
      .map((p) => String(p).trim())
      .filter(Boolean);
    return parts.join(" ") || "—";
  };
  const drivers = await prisma.user.findMany({
    where: { isDriver: true },
    select: { id: true, name: true, email: true, phone: true },
  });

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const computeDistanceKm = (
    a?: { latitude?: number | null; longitude?: number | null } | null,
    b?: { latitude?: number | null; longitude?: number | null } | null
  ) => {
    const lat1 = a?.latitude;
    const lon1 = a?.longitude;
    const lat2 = b?.latitude;
    const lon2 = b?.longitude;
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
      return null;
    }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const la1 = toRad(lat1);
    const la2 = toRad(lat2);
    const aHarv =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    const d = R * c;
    return Number.isFinite(d) ? Math.round(d * 10) / 10 : null;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Réservations</h1>
          <p className="text-sm text-muted-foreground">Mettre à jour statuts et informations.</p>
        </div>
        <BackButton label="Retour au dashboard" href="/dashboard" />
      </div>
      <div className="mt-6">
        <BookingsAdminTable
          initialBookings={JSON.parse(
            JSON.stringify(
              bookings.map((b) => ({
                ...b,
                pickupLabel: formatAddress(b.pickup),
                dropoffLabel: formatAddress(b.dropoff),
                distanceKm: computeDistanceKm(b.pickup, b.dropoff),
                notes: b.bookingNotes?.length
                  ? b.bookingNotes[b.bookingNotes.length - 1]?.content
                  : undefined,
              }))
            )
          )}
          drivers={JSON.parse(JSON.stringify(drivers))}
          currentUser={session?.user ?? null}
        />
      </div>
    </div>
  );
}
