import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("charvieu-chavagneux");

export const metadata: Metadata = {
  title: "Taxi Charvieu-Chavagneux | Aéroport, gares et Eurexpo",
  description:
    "Taxi à Charvieu-Chavagneux pour Saint-Exupéry, Part-Dieu et Eurexpo. Chauffeurs disponibles 24/7, accueil pancarte, assistance bagages et facturation claire.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
