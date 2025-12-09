import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("tignieu");

export const metadata: Metadata = {
  title: "Taxi Tignieu-Jameyzieu | Transferts aéroport et gares | Taxi Tignieu",
  description:
    "Taxi Tignieu-Jameyzieu : transferts Lyon Saint-Exupéry, Part-Dieu, longues distances et VSL/CPAM. Chauffeurs locaux 24/7, suivi d'approche et confort premium.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
