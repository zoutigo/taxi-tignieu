import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("cremieu");

export const metadata: Metadata = {
  title: "Taxi Crémieu | Aéroport, longues distances et tourisme",
  description:
    "Taxi à Crémieu : transferts Lyon Saint-Exupéry, gares, Bourgoin ou circuits touristiques. Chauffeur local, van 7 places sur demande.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
