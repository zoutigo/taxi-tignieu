import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("chavanoz");

export const metadata: Metadata = {
  title: "Taxi Chavanoz | Aéroport, gares et VSL",
  description:
    "Taxi à Chavanoz : transferts Saint-Exupéry, gares de Lyon et rendez-vous santé. Chauffeurs agréés, VSL/CPAM et suivi SMS.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
