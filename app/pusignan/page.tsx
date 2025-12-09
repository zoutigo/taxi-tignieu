import type { Metadata } from "next";
import { CityPage } from "@/app/cities/CityPage";
import { getCity } from "@/app/cities/city-data";

const city = getCity("pusignan");

export const metadata: Metadata = {
  title: "Taxi Pusignan | Aéroport et gares à proximité",
  description:
    "Taxi à Pusignan : départs rapides vers Lyon Saint-Exupéry, Part-Dieu et Eurexpo. Suivi d'approche, facturation pro et confort premium.",
};

export default function Page() {
  if (!city) return null;
  return <CityPage city={city} />;
}
