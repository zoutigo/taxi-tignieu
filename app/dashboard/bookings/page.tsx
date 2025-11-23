import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingsAdminTable } from "@/components/dashboard/bookings-admin-table";

export default async function DashboardBookingsPage() {
  const session = await auth();
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
    } as unknown as NonNullable<Parameters<typeof prisma.booking.findMany>[0]>["include"],
  });
  const drivers = await prisma.user.findMany({
    where: { isDriver: true },
    select: { id: true, name: true, email: true, phone: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Réservations</h1>
      <p className="text-sm text-muted-foreground">Mettre à jour statuts et informations.</p>
      <div className="mt-6">
        <BookingsAdminTable
          initialBookings={JSON.parse(JSON.stringify(bookings))}
          drivers={JSON.parse(JSON.stringify(drivers))}
          currentUser={session?.user ?? null}
        />
      </div>
    </div>
  );
}
