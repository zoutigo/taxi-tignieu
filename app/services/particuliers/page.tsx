import ServiceDetailPage from "@/app/services/[slug]/page";

export default function ParticuliersPage() {
  return ServiceDetailPage({ params: { slug: "particuliers" } });
}
