import type { Metadata } from "next";
import { ReservationWizard } from "@/components/reservation-wizard";

export const metadata: Metadata = {
  title: "Réserver un taxi | Taxi Tignieu",
  description: "Confirmez votre trajet en quelques étapes avec Taxi Tignieu.",
};

export default function ReserverPage() {
  return <ReservationWizard mode="create" successRedirect="/espace-client/bookings" useStore />;
}
