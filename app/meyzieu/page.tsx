import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("meyzieu");

export const metadata: Metadata = {
  title: "Taxi Meyzieu | Eurexpo, aéroport et gares",
  description:
    "Taxi à Meyzieu pour Eurexpo, Lyon Saint-Exupéry et Part-Dieu. Chauffeurs disponibles pour vos équipes en salon et vos trajets quotidiens.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
