import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/dashboard/users-table";

export default async function DashboardUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isAdmin: true,
      isManager: true,
      isDriver: true,
      bookings: {
        select: {
          id: true,
          pickup: true,
          dropoff: true,
          status: true,
          createdAt: true,
          luggage: true,
          priceCents: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Utilisateurs</h1>
      <p className="text-sm text-muted-foreground">Gestion des rôles et réservations associées.</p>
      <div className="mt-6">
        <UsersTable initialUsers={JSON.parse(JSON.stringify(users))} />
      </div>
    </div>
  );
}
