import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReservationWizard, type SavedAddressOption } from "@/components/reservation-wizard";
import type { Address } from "@prisma/client";
import { getSiteContact } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Réserver un taxi | Taxi Tignieu",
  description: "Confirmez votre trajet en quelques étapes avec Taxi Tignieu.",
};

const formatAddressLine = (address: Address) =>
  [address.streetNumber, address.street, address.postalCode, address.city, address.country]
    .filter(Boolean)
    .join(" ");

export default async function ReserverPage() {
  const [session, contact] = await Promise.all([auth(), getSiteContact()]);
  let savedAddresses: SavedAddressOption[] = [];

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultAddressId: true,
        addresses: {
          include: { address: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (user?.addresses) {
      savedAddresses = user.addresses.map((addr) => ({
        id: addr.id,
        label: addr.label,
        addressLine: formatAddressLine(addr.address),
        address: {
          label: formatAddressLine(addr.address),
          street: addr.address.street ?? "",
          streetNumber: addr.address.streetNumber ?? "",
          postcode: addr.address.postalCode ?? "",
          city: addr.address.city ?? "",
          country: addr.address.country ?? "",
          lat: addr.address.latitude ?? NaN,
          lng: addr.address.longitude ?? NaN,
          name: addr.address.name ?? undefined,
        },
        isDefault: addr.id === user.defaultAddressId,
      }));
    }
  }

  return (
    <ReservationWizard
      mode="create"
      successRedirect="/espace-client/bookings"
      useStore
      savedAddresses={savedAddresses}
      supportPhone={contact.phone}
      supportEmail={contact.email}
    />
  );
}
