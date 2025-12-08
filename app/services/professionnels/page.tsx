import ServiceDetailPage from "@/app/services/[slug]/page";

export default function ProfessionnelsPage() {
  return ServiceDetailPage({ params: { slug: "professionnels" } });
}
