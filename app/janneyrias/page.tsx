import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("janneyrias");

export const metadata: Metadata = {
  title: "Taxi Janneyrias | Aéroport Saint-Exupéry et Eurexpo",
  description:
    "Taxi à Janneyrias pour Saint-Exupéry, Eurexpo et Lyon. Chauffeur proche de l'aéroport, accueil pancarte et facturation instantanée.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
