import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserAddressesManager } from "@/components/user-addresses-manager";

export const metadata: Metadata = {
  title: "Mes adresses | Taxi Tignieu",
};

export default async function UserAddressesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      phone: true,
      image: true,
      defaultAddressId: true,
      addresses: {
        include: { address: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/");
  if (!user.phone) redirect("/profil/completer-telephone?from=/espace-client/adresses");
  if (!user.image) redirect("/profil/choisir-avatar?from=/espace-client/adresses");

  const addresses = user.addresses.map((addr) => ({
    ...addr,
    isDefault: addr.id === user.defaultAddressId,
  }));

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="surface mb-6 p-6 sm:p-8">
        <p className="badge-pill text-xs text-muted-foreground">Espace client</p>
        <h1 className="mt-2 font-display text-3xl text-foreground">Mes adresses</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez vos adresses fréquentes et sélectionnez celle utilisée par défaut pour vos
          trajets.
        </p>
      </div>

      <UserAddressesManager
        initialAddresses={
          addresses as unknown as Parameters<typeof UserAddressesManager>[0]["initialAddresses"]
        }
      />
    </section>
  );
}
