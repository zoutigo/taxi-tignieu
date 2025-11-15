import type { Metadata } from "next";
import { TarifsPage } from "@/components/tarifs-page";

export const metadata: Metadata = {
  title: "Tarifs taxi | Taxi Tignieu",
  description: "Estimez votre trajet, consultez nos forfaits et réservez en ligne.",
};

export default function Tarifs() {
  return <TarifsPage />;
}
