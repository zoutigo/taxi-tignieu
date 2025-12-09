import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("pont-de-cheruy");

export const metadata: Metadata = {
  title: "Taxi Pont-de-Chéruy | Aéroport et trajets professionnels",
  description:
    "Taxi à Pont-de-Chéruy : transferts Saint-Exupéry, gares de Lyon, Eurexpo. Chauffeurs référencés, VSL/CPAM et suivi temps réel.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
