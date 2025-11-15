import type { Metadata } from "next";
import { ReservationPage } from "@/components/reservation-page";

export const metadata: Metadata = {
  title: "Réserver un taxi | Taxi Tignieu",
  description: "Confirmez votre trajet en quelques étapes avec Taxi Tignieu.",
};

export default function ReserverPage() {
  return <ReservationPage />;
}
