import ServiceDetailPage from "@/app/services/[slug]/page";

export default function SpecialisesPage() {
  return ServiceDetailPage({ params: { slug: "specialises" } });
}
