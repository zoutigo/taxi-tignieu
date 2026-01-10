import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mes réservations | Taxi Tignieu",
};

export default function ClientReservationsRedirect() {
  redirect("/espace-client/bookings");
}
